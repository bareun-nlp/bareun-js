const conf = require("./config.js");
const ClientBase = require("./ClientBase.js");

var lanaguage_service_proto = 'language_service.proto';

var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');

class BaikalLanguageServiceClient extends ClientBase {    
    constructor(remote = null) {
        super(lanaguage_service_proto, "LanguageService", remote );
    }

    _newRequest(text, domain = null, auto_split = false) {
        const document = {
            content : text,
            language : "ko-KR"
        }
        let analyzeSyntaxRequest = {
            document : document,
            encoding_type : this.proto.EncodingType.UTF32,
            auto_split_sentence : auto_split 
        } 
        if( domain ) 
            analyzeSyntaxRequest.custom_domain = domain;
        
        return analyzeSyntaxRequest;
    }

    AnalyzeSyntax ( text, domain = null, auto_split = false, callback = null ) {
        if( typeof domain === "function" ) {
            callback = domain;
            domain = null;
        } else if( typeof auto_split  === "function" ) {
            callback = auto_split;
            auto_split = false;
        }
        if( !callback ) {
            throw new Error("callback is null.");
        }
        let pThis = this;
        this.client.AnalyzeSyntax(this._newRequest(text, domain, auto_split),
            (error, analyzeSyntaxResponse) => {
                callback(error, analyzeSyntaxResponse);
            });
        return this;
    }

    async asyncAnalyzeSyntax(text, domain = null, auto_split = false ) {
        let promise = new Promise( (resolve, reject) => {
                this.client.AnalyzeSyntax(
                    this._newRequest(text, domain, auto_split),
                    (error, analyzeSyntaxResponse) => {
                        if( error ) {
                            reject(error);
                            return;
                        }
                        resolve(analyzeSyntaxResponse)
                    })                    
            }
        );
        return promise;
    }

    static emptyAnalyzeSyntaxResponse = () =>  {
        sentences : []
    }
}


module.exports = BaikalLanguageServiceClient;
