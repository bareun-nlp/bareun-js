const conf = require("./config.js");
const ClientBase = require("./ClientBase.js");

const proto_file = 'custom_dict.proto';

var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');

const common = ClientBase.getProto("dict_common.proto");

function build_dict_set(domain, name, dict_set) {
    let ret = {
        name: domain + '-' + name,
        type: common.DictType.WORD_LIST,
        items: {}
    }
    if (dict_set instanceof Set || Array.isArray(dict_set)) {
        for (const v of dict_set)
            ret.items[v] = 1;
    } else {
        for (const v of Object.keys(dict_set))
            ret.items[v] = 1;
    }
    return ret;
}

function isNull(v) {
    return (v === undefined || v === null) ? true : false;
}

class CustomDictionaryServiceClient extends ClientBase {
    constructor(remote = null, api_key = "") {
        super(proto_file, "CustomDictionaryService", remote);
        this.meta.add('api-key', api_key);
    }
    meta = new grpc.Metadata();

    static common_proto = common;
    static build_dict_set = build_dict_set;

    get_list(callback) {
        this.client.GetCustomDictionaryList({}, this.meta
            , (err, res) => callback(err, !isNull(res) ? res.domain_dicts : res));
        return this;
    }

    async async_get_list() {
        return new Promise(
            (resolve, reject) => {
                this.get_list(
                    (err, res) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(res);
                    });
            }
        );
    }

    get(domain, callback) {
        this.client.GetCustomDictionary({ domain_name: domain }, this.meta
            , (err, res) => callback(err, !isNull(res) ? res.dict : res));
        return this;
    }

    async async_get(domain) {
        return new Promise(
            (resolve, reject) => {
                this.get(domain
                    , (err, res) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(res);
                    });
            }
        );
    }

    update(domain, word_sets, callback) {
        let dict = { domain_name: domain };
        for (const name of Object.keys(word_sets)) {
            dict[name] = build_dict_set(domain, name.replace("_", "-"), word_sets[name]);
        }
        this.client.UpdateCustomDictionary({
            domain_name: domain,
            dict: dict
        }, this.meta,
            (err, res) => callback(err, !isNull(res) ? (res.updated_domain_name == domain) : false));
        return this;
    }

    async async_update(domain, word_sets) {
        return new Promise(
            (resolve, reject) => {
                this.update(domain, word_sets
                    , (err, res) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(res);
                    });
            }
        );
    }

    remove_all(callback) {
        this.client.RemoveCustomDictionaries({ all: true }
            , this.meta, (err, res) => callback(err, !isNull(res) ? Object.keys(res.deleted_domain_names) : res));
        return this;
    }

    async async_remove_all() {
        return new Promise(
            (resolve, reject) => {
                this.remove_all(
                    (err, res) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(res);
                    });
            }
        );
    }

    remove(domains, callback) {
        if (typeof domains === "string")
            domains = [domains];
        this.client.RemoveCustomDictionaries({ domain_names: domains, all: false }
            , this.meta, (err, res) => callback(err, !isNull(res) ? Object.keys(res.deleted_domain_names) : res));
        return this;
    }
    async async_remove(domains) {
        return new Promise(
            (resolve, reject) => {
                this.remove(domains,
                    (err, res) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(res);
                    });
            }
        );
    }
}

module.exports = CustomDictionaryServiceClient;