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

    AnalyzeSyntax ( text, domain = null, auto_split = false ) {        
        let pThis = this;
        this.client.AnalyzeSyntax(this._newRequest(text, domain, auto_split),
            (error, analyzeSyntaxResponse) => {
                pThis.proc_response(error, analyzeSyntaxResponse);
            });
        return this;
    }

    async asyncAnalyzeSyntax(text, domain = null, auto_split = false ) {
        let promise = new Promise( (resolve, reject) => {
                this.client.AnalyzeSyntax(this._newRequest(text, domain, auto_split),
                    (error, analyzeSyntaxResponse) => resolve([error, analyzeSyntaxResponse]))
            }
        );
        return await promise;
    }
}

BaikalLanguageServiceClient.emptyAnalyzeSyntaxResponse = () =>  {
    sentences : []
}

module.exports = BaikalLanguageServiceClient;
