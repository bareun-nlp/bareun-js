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

        // let packageDefinition = protoLoader.loadSync(
        //     protofile,
        //     {
        //         keepCase: true,
        //         longs: String,
        //         enums: String,
        //         defaults: true,
        //         oneofs: true,
        //         includeDirs: conf.protos.includeDirs
        //       });


        this.proto = ClientBase.getProto(protofile) ;
        // grpc.loadPackageDefinition(packageDefinition).bareun;

        this.client = new this.proto[service](
            this.remote,
            grpc.credentials.createInsecure()
            );
    }


/*
    error(callback) {
        this.error_callback = callback;
        return this;
    }
    done(callback) {
        this.done_callback = callback;
        return this;
    }

    proc_response(err, res) {
        let _err = this.error_callback;
        this.error_callback = null;
        let _done = this.done_callback;
        this.done_callback = null;

        if( err ) {
            if(!_err) {
                console.log("ERROR : error_callback is null.")
                return ;
            }
            _err(err);
        } 
        else {
            if(!_done) {
                console.log("ERROR : done_callback is null.")
                return ;
            }
            _done(res);
        }
    }
    */

}

module.exports = ClientBase;