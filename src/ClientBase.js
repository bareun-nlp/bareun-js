const conf = require("./config.js");

var grpc = require('@grpc/grpc-js');
var protoLoader = require('@grpc/proto-loader');
var Empty = null;

function newEmptyProto() {
    if( Empty ) return new Empty();
    let packageDefinition = protoLoader.loadSync(
        "google/protobuf/empty.proto",
        {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
            includeDirs: conf.protos.includeDirs
          });

    let proto = grpc.loadPackageDefinition(packageDefinition);
    Empty = proto.google.protobuf.Empty;
    return new Empty();    
}

class ClientBase {
    client;
    error_callback = null;
    done_callback = null;
    proto = null;
    constructor(protofile, service, remote) {
        if( remote == null ) {
            remote = conf.default.nlp_host + ":" + conf.default.nlp_port;
        }
        if( remote.indexOf(":") < 0 ) 
            remote += ":" + conf.default.nlp_port;
        
        this.remote = remote;

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


        this.proto = grpc.loadPackageDefinition(packageDefinition).baikal.language;

        this.client = new this.proto[service](
            this.remote,
            grpc.credentials.createInsecure()
            );
    }

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

}

ClientBase.newEmptyProto = newEmptyProto;

module.exports = ClientBase;