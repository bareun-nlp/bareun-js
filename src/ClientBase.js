const conf = require("./config.js");

var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
var Empty = null;



class ClientBase {
    client;
    proto = null;

    static getProto(protofile) {
        let packageDefinition = protoLoader.loadSync(
            protofile,
            {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true,
                includeDirs: conf.protos.includeDirs
              });


        let proto = grpc.loadPackageDefinition(packageDefinition).bareun;
        return proto;
    }

    constructor(protofile, service, remote) {
        if( remote == null ) {
            remote = conf.default.nlp_host + ":" + conf.default.nlp_port;
        }
        if( remote.indexOf(":") < 0 ) 
            remote += ":" + conf.default.nlp_port;
        
        this.remote = remote;

        this.proto = ClientBase.getProto(protofile) ;

        this.client = new this.proto[service](
            this.remote,
            grpc.credentials.createInsecure()
            );
    }




}

module.exports = ClientBase;