var util = require('./util');
var postJSON = util.postJSON;

/*!
 * 需要access token的接口调用如果采用preRequest进行封装后，就可以直接调用。
 * 无需依赖getAccessToken为前置调用。
 * 应用开发者无需直接调用此API。
 *
 * Examples:
 * ```
 * api.request(method, arguments);
 * ```
 * @param {Function} method 需要封装的方法
 * @param {Array} args 方法需要的参数
 */

/*!
 * 获取预授权码
 * 该API用于获取预授权码。预授权码用于企业号授权时的应用提供商安全验证。
 */
exports.getPreAuthCode = async function (apps) {
  var url = this.prefix + 'service/get_pre_auth_code'
  var data = {
    suite_id: this.suiteId
  }
  if (apps) {
    data.appid = apps;
  }
  return await this.preRequst(url, postJSON(data));
};

/*!
 * 设置授权配置
 * 如果需要对某次授权进行配置，则调用本接口，目前仅可以设置哪些应用可以授权，不调用则默认允许所有应用进行授权。
 */

exports.setSessionInfo = async function (pre_auth_code, apps) {
  var url = this.prefix + 'service/set_session_info';
  var data = {
    pre_auth_code: pre_auth_code,
    session_info: {
      appid: apps
    }
  };
  return await this.preRequst(url, postJSON(data))
};


/*!
 * 获取企业号的永久授权码
 * 该API用于使用临时授权码换取授权方的永久授权码，并换取授权信息、企业access_token。
 * 临时码使用一次就会实效，需要将永久授权码保存起来，以备后续使用
 */
exports.getPermanentCode = async function (authCode) {
  var url = this.prefix + 'service/get_permanent_code';
  var data = {
    suite_id: this.suiteId,
    auth_code: authCode
  };

  return await this.preRequst(url, postJSON(data));
};

/*!
 * 该API用于通过永久授权码换取企业号的授权信息。 
 * 永久code的获取，是通过临时授权码使用get_permanent_code 接口获取到的permanent_code。
 */
exports.getAuthInfo = async function (authCorpId, permanentCode) {
  // https://qyapi.weixin.qq.com/cgi-bin/service/get_auth_info?suite_access_token=xxxx
  var url = this.prefix + 'service/get_auth_info';
  var data = {
    suite_id: this.suiteId,
    auth_corpid: authCorpId,
    permanent_code: permanentCode
  };

  return await this.preRequst(url, postJSON(data));
};


/*!
 * 获取企业号应用
 * 该API用于获取授权方的企业号某个应用的基本信息，包括头像、昵称、帐号类型、认证类型、可见范围等信息
 */
exports.getAgent = async function (authCorpId, permanentCode, agentId) {
  // https://qyapi.weixin.qq.com/cgi-bin/service/get_agent?suite_access_token=xxxx
  var url = this.prefix + 'service/get_agent';
  var data = {
    suite_id: this.suiteId,
    auth_corpid: authCorpId,
    permanent_code: permanentCode,
    agentid: agentId
  };

  return await this.preRequst(url, postJSON(data));
};


/*!
 * 设置企业号应用
 * 该API用于设置授权方的企业应用的选项设置信息，如：地理位置上报等。注意，获取各项选项设置信息，需要有授权方的授权。
 * POST数据示例
 * ```````````
 *  {
 *    "suite_id":"id_value",
 *    "auth_corpid": "auth_corpid_value",
 *    "permanent_code ": "code_value",
 *    "agent": 
 *    {
 *      "agentid": "5",
 *      "report_location_flag": "0",
 *      "logo_mediaid": "xxxxx",
 *      "name": "NAME",
 *      "description": "DESC",
 *      "redirect_domain": "xxxxxx",
 *      "isreportuser":0
 *    }
 *  }
 *
 * ```````````
 */
exports.setAgent = async function (authCorpId, permanentCode, agent) {
  // https://qyapi.weixin.qq.com/cgi-bin/service/set_agent?suite_access_token=xxxx
  var url = this.prefix + 'service/set_agent';
  var data = {
    suite_id: this.suiteId,
    auth_corpid: authCorpId,
    permanent_code: permanentCode,
    agent: agent
  };

  return await this.preRequst(url, postJSON(data));
};


/*!
 * 获取企业号access_token
 * 应用提供商在取得企业号的永久授权码并完成对企业号应用的设置之后，便可以开始通过调用企业接口（详见企业接口文档）来运营这些应用。其中，调用企业接口所需的access_token获取方法如下。
 */
exports.getCorpToken = async function (authCorpId, permanentCode) {
  // https://qyapi.weixin.qq.com/cgi-bin/service/get_corp_token?suite_access_token=xxxx
  var url = this.prefix + 'service/get_corp_token';
  var data = {
    suite_id: this.suiteId,
    auth_corpid: authCorpId,
    permanent_code: permanentCode
  };

  return await this.preRequst(url, postJSON(data));
};
