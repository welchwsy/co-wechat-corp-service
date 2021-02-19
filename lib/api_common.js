var urllib = require('urllib');
var util = require('./util');
var extend = require('util')._extend;
var postJSON = util.postJSON;

class SuiteAccessToken {
  constructor(suiteAccessToken, expireTime) {
    this.suiteAccessToken = suiteAccessToken;
    this.expireTime = expireTime;
  }

  /*!
   * 检查AccessToken是否有效，检查规则为当前时间和过期时间进行对比
   * Examples:
   * ```
   * token.isValid();
   * ```
   */
  isValid() {
    return !!this.suiteAccessToken && Date.now() < this.expireTime;
  }
}


class API {
/**
 * 根据suite_id、suite_secret和suite_ticket创建API的构造函数。
 *
 * 如需跨进程跨机器进行操作Wechat API（依赖access token），access token需要进行全局维护
 * 使用策略如下：
 *
 * 1. 调用用户传入的获取token的异步方法，获得token之后使用
 * 2. 使用appid/appsecret获取token。并调用用户传入的保存token方法保存
 *
 * Examples:
 * ```
 * var API = require('wechat-corp-service');
 * var api = new API('suite_id', 'suite_secret', 'suite_ticket');
 * ```
 * 以上即可满足单进程使用。
 * 当多进程时，token需要全局维护，以下为保存token的接口。
 * ```
 * var api = new API('suite_id', 'suite_secret', 'suite_ticket', function (callback) {
 *   // 传入一个获取全局token的方法
 *   fs.readFile('suite_access_token.txt', 'utf8', function (err, txt) {
 *     if (err) {return callback(err);}
 *     callback(null, JSON.parse(txt));
 *   });
 * }, function (token, callback) {
 *   // 请将token存储到全局，跨进程、跨机器级别的全局，比如写到数据库、redis等
 *   // 这样才能在cluster模式及多机情况下使用，以下为写入到文件的示例
 *   fs.writeFile('suite_access_token.txt', JSON.stringify(token), callback);
 * });
 * ```
 * @param {String} suiteId 在PaaS平台上申请得到的suiteId
 * @param {String} suiteSecret 在PaaS平台上申请得到的suiteSecret
 * @param {String} suiteTicket 微信服务器每10分钟向回调接口推送的suite_ticket消息
 * @param {AsyncFunction} getToken 可选的。获取全局token对象的方法，多进程模式部署时需在意
 * @param {AsyncFunction} saveToken 可选的。保存全局token对象的方法，多进程模式部署时需在意
 */
  constructor (suiteId, suiteSecret, suiteTicket, getToken, saveToken, tokenFromCustom) {
    this.suiteId = suiteId;
    this.suiteSecret = suiteSecret;
    this.suiteTicket = suiteTicket;
    this.store = null;
    this.getToken = getToken || async function () {
      return this.store;
    };
    this.saveToken = saveToken || async function (token) {
      this.store = token;
      if (process.env.NODE_ENV === 'production') {
        console.warn('Don\'t save token in memory, when cluster or multi-computer!');
      }
    };
    this.prefix = 'https://qyapi.weixin.qq.com/cgi-bin/';
    this.defaults = {};
    this.tokenFromCustom = tokenFromCustom
  }

  /**
   * 用于设置urllib的默认options * Examples:
   * ```
   * api.setOpts({timeout: 15000});
   * ```
   * @param {Object} opts 默认选项
   */
  setOpts(opts) {
    this.defaults = opts;
  }

    /**
   * 设置urllib的hook
   */
  async request(url, opts, retry = 3) {
    var options = {};
    Object.assign(options, this.defaults);
    opts || (opts = {});
    var keys = Object.keys(opts);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key !== 'headers') {
        options[key] = opts[key];
      } else {
        if (opts.headers) {
          options.headers = options.headers || {};
          Object.assign(options.headers, opts.headers);
        }
      }
    }
    // 调用用户传入的获取token的异步方法，获得token之后使用（并缓存它）。
    const token = await this.getToken()
    if (token && token.isValid()) {
      // 有token并且token有效直接调用
      this.suiteToken = new SuiteAccessToken(token)
    } else {
      await this.getSuiteToken()
    }
    const res = await urllib.request(url, options)

    if (res.statusCode < 200 || res.statusCode > 204) {
      var err = new Error(`url: ${url}, status code: ${res.statusCode}`);
      err.name = 'WeChatAPIError';
      throw err;
    }
    const data = res.data
    if (data && data.errcode) {
      let err = new Error(data.errmsg);
      err.name = 'WeChatAPIError';
      err.code = data.errcode;

      if ((err.code === 40001 || err.code === 42001) && retry > 0 && !this.tokenFromCustom) {
        // 销毁已过期的token
        await this.saveToken(null);
        await this.getSuiteToken();
        let urlobj = new URL(url);
        urlobj.searchParams.set('suite_access_token', this.suiteToken.suiteAccessToken)
        return this.request(urlobj.href, opts, retry - 1);
      }

      throw err;
    } else {
      return data
    }
  }

  async preRequst(url, opts, retry = 3) {
    // 调用用户传入的获取token的异步方法，获得token之后使用（并缓存它）。
    const token = await this.getToken()
    if (token && token.isValid()) {
      // 有token并且token有效直接调用
      this.suiteToken = new SuiteAccessToken(token)
    } else {
      await this.getSuiteToken()
    }
    let urlobj = new URL(url);
    urlobj.searchParams.set('suite_access_token', this.suiteToken.suiteAccessToken)
    return await this.request(urlobj.href, opts, retry);
  }

  /*!
 * 根据创建API时传入的suiteId,suiteSecret和suiteTicket获取suite access token
 * 进行后续所有API调用时，需要先获取access token
 * 详细请看：<http://mp.weixin.qq.com/wiki/index.php?title=获取access_token>
 *
 * 应用开发者无需直接调用本API。
 *
 * Examples:
 * ```
 * api.getSuiteToken(callback);
 * ```
 * Callback:
 *
 * - `err`, 获取access token出现异常时的异常对象
 * - `result`, 成功时得到的响应结果
 *
 * Result:
 * ```
 * {"suiteAccessToken": "ACCESS_TOKEN",
 *  "expireTime": 7200 }
 * ```
 * @param {Function} callback 回调函数
 */

async getSuiteToken () {
  // https://qyapi.weixin.qq.com/cgi-bin/department/create?access_token=ACCESS_TOKEN
  var url = this.prefix + 'service/get_suite_token';
  var reqBody = {
    suite_id: this.suiteId,
    suite_secret: this.suiteSecret,
    suite_ticket: this.suiteTicket
  };
  const response = await urllib.request(url, postJSON(reqBody));
  const data = response.data
  // var data = await this.request(url, postJSON(data));
  // 过期时间，因网络延迟等，将实际过期时间提前10秒，以防止临界点
  var expireTime = Date.now() + (data.expires_in - 10) * 1000;
  var token = new SuiteAccessToken(data.suite_access_token, expireTime);
  // 暂时保存token
  this.suiteToken = token;
  await this.saveToken(token);
  return token;
}

/*!
 * generateAuthUrl
 * 拼装出第三方授权用的URL
 * Examples:
 * ```
 * api.generateAuthUrl((preAuthCode, redirectUri, state);
 * ```
 *
 */

  generateAuthUrl (preAuthCode, redirectUri, state) {
    return 'https://qy.weixin.qq.com/cgi-bin/loginpage?suite_id=' + this.suiteId +
      "&pre_auth_code=" + preAuthCode + "&redirect_uri=" +
      redirectUri + "&state=" + state;
  }

  /**
   * 获取最新的token。
   *
   * - 如果还没有请求过token，则发起获取Token请求。
   * - 如果请求过，则调用getToken从获取之前保存的token
   *
   * Examples:
   * ```
   * api.getLatestToken(callback);
   * ```
   * Callback:
   *
   * - `err`, 获取access token出现异常时的异常对象
   * - `token`, 获取的token
   *
   * @param {Function} callback 回调函数
   */
  async getLatestToken () {
    // 调用用户传入的获取token的异步方法，获得token之后使用（并缓存它）。
    const token = await this.getToken()
    if (token) {
      this.suiteToken = token;
      return new SuiteAccessToken(token)
    } else {
      return await this.getSuiteToken()
    }
  }

  setSuiteTicket (newTicket) {
    this.suiteTicket = newTicket;
  }

}

/**
 * 用于支持对象合并。将对象合并到API.prototype上，使得能够支持扩展
 * Examples:
 * ```
 * // 媒体管理（上传、下载）
 * API.mixin(require('./lib/api_media'));
 * ```
 * @param {Object} obj 要合并的对象
 */
API.mixin = function (obj) {
  for (var key in obj) {
    if (API.prototype.hasOwnProperty(key)) {
      throw new Error('Don\'t allow override existed prototype method. method: '+ key);
    }
    API.prototype[key] = obj[key];
  }
};

API.suiteToken = SuiteAccessToken;

module.exports = API;
