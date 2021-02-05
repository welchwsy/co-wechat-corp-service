// api_service.test.js
const assert = require('assert')
var muk = require('muk');
var config = require('./config');
var API = require('../');

describe('api_service', function () {
  var api = new API(config.suite_id, config.suite_secert, config.suite_ticket);
  var pre_auth_code, permanent_code, auth_corp_info_corpid;
  before(async function () {
    await api.getSuiteToken();
  });

  it('getPreAuthCode should ok', async function () {
    const data = await api.getPreAuthCode(config.apps)
    pre_auth_code = data.pre_auth_code;
    assert(pre_auth_code)
  });

  // it('getPermanentCode should ok', async function () {
  //   const data = await api.getPermanentCode(config.auth_code)
  //   permanent_code = data.permanent_code;
  //   auth_corp_info_corpid = data.auth_corp_info.corpid;
  //   assert(data.permanent_code)
  // });

  // it('getAuthInfo should ok', function (done) {
  //   api.getAuthInfo(auth_corp_info_corpid, permanent_code, function (err, data, res) {
  //     expect(err).not.to.be.ok();
  //     expect(data).to.have.key('auth_corp_info');
  //     expect(data).to.have.key('auth_info');
  //     done();
  //   });
  // });

  // it('getAgent should ok', function (done) {
  //   api.getAgent(auth_corp_info_corpid, permanent_code, 1, function (err, data, res) {
  //     expect(err).not.to.be.ok();
  //     expect(data).to.have.property('errmsg', 'ok');
  //     done();
  //   });
  // });

  // it('setAgent should ok', function (done) {
  //   api.setAgent(auth_corp_info_corpid, permanent_code, config.agent, function (err, data, res) {
  //     expect(err).not.to.be.ok();
  //     expect(data).to.have.property('errmsg', 'ok');
  //     done();
  //   });
  // });

  // it('getCorpToken should ok', function (done) {
  //   api.getCorpToken(auth_corp_info_corpid, permanent_code, function (err, data, res) {
  //     expect(err).not.to.be.ok();
  //     expect(data).to.have.key('access_token');
  //     done();
  //   });
  // });

});
