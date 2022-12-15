const conf = require("./config.js");
const ClientBase = require("./ClientBase.js");

const proto_file = 'custom_dict.proto';

var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');

const common = ClientBase.getProto("dict_common.proto");

function build_dict_set(domain, name, dict_set) {
    let ret = {
        name : domain + '-' + name,
        type : common.DictType.WORD_LIST,
        items : {}
    }
    if( dict_set instanceof Set || Array.isArray(dict_set) ) {
        for( const v of dict_set )
            ret.items[v] = 1;
    } else {
        for( const v of dict_set.keys() )
            ret.items[v] = 1;
    }
    return ret;
}

class CustomDictionaryServiceClient extends ClientBase {    
    constructor(remote = null) {
        super(proto_file, "CustomDictionaryService", remote );
    }



    get_list(callback) {
        this.client.GetCustomDictionaryList({}
            , (err, res) => callback(err, res!==null?res.domain_dicts:res));
        return this;
    }

    async async_get_list() {
        return new Promise( 
            (resolve, reject) => {
                this.get_list(
                    (err, res) => {
                        if( err ) {
                            reject(err);
                            return ;
                        }
                        resolve(res);
                    });
            }
        );
    }

    get(domain, callback) {
        this.client.GetCustomDictionary({domain_name:domain}
            , (err, res) => callback(err, res!==null?res.dict:res));
        return this;
    }

    async async_get_list(domain) {
        return new Promise( 
            (resolve, reject) => {
                this.get(domain
                    , (err, res) => {
                        if( err ) {
                            reject(err);
                            return ;
                        }
                        resolve(res);
                    });
            }
        );
    }

    update(domain, np, cp, cp_caret, callback) {
        this.client.GetCustomDictionary({
                domain_name:domain,
                dict : {
                    domain_name : domain,
                    np_set : build_dict_set(domain, 'np-set', np),
                    cp_set : build_dict_set(domain, 'cp-set', cp),
                    cp_caret_set : build_dict_set(domain, 'cp-caret-set', cp_caret)
                }
            },
            (err, res) => callback(err, res!==null?(res.updated_domain_name == domain):false));
        return this;
    } 

    async async_update(domain, np, cp, cp_caret) {
        return new Promise( 
            (resolve, reject) => {
                this.update(domain, np, cp, cp_caret
                    , (err, res) => {
                        if( err ) {
                            reject(err);
                            return ;
                        }
                        resolve(res);
                    });
            }
        );
    }

    remove_all(callback) {
        this.client.RemoveCustomDictionaries({ all : true }
            , (err, res) => callback(err, res!==null?res.deleted_domain_names.keys():res));
        return this;
    }

    async async_remove_all() {
        return new Promise( 
            (resolve, reject) => {
                this.remove_all(
                    (err, res) => {
                        if( err ) {
                            reject(err);
                            return ;
                        }
                        resolve(res);
                    });
            }
        );
    }

    remove(domains, callback) {
        this.client.RemoveCustomDictionaries({ domain_names : domains, all : false }
            , (err, res) => callback(err, res!==null?res.deleted_domain_names.keys():res));
        return this;
    }
    async async_remove() {
        return new Promise( 
            (resolve, reject) => {
                this.remove(
                    (err, res) => {
                        if( err ) {
                            reject(err);
                            return ;
                        }
                        resolve(res);
                    });
            }
        );
    }
}

module.exports = CustomDictionaryServiceClient;