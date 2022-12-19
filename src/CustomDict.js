const conf = require("./config.js");
const CustomDictionaryServiceClient = require("./CustomDictionaryServiceClient.js");
var fs = require('fs');
var readline = require('readline');

const cp_set = "cp_set";
const np_set = "np_set";
const cp_caret_set = "cp_caret_set";
const vv_set = "vv_set";
const va_set = "va_set";

class CustomDict {
    opts;
    client;
    word_sets = {};

    constructor(domain, host=conf.default.nlp_host, port=conf.default.nlp_port) {
        this.opts = {domain:domain};
        if( host instanceof CustomDictionaryServiceClient ) {
            this.client = host;
            host = this.client.remote;
            let arr = host.split(":");
            this.opts.host = arr[0];
            this.opts.port = parseInt(arr[1]);
        } else {
            if( host.indexOf(":") >= 0 ) {
                let arr = host.split(":");
                this.opts.host = arr[0];
                this.opts.port = parseInt(arr[1]);
            }
            else {
                this.opts.host = host;
                this.opts.port = port;
            }
            this.client = new CustomDictionaryServiceClient(this.opts.host + ":" + this.opts.port);
        }
    }

    static async read_dic_file(fn) {
        let ret = new Set();

        let instream = fs.createReadStream(fn); 
        let reader = readline.createInterface(instream, process.stdout);
        
        let count = 0;
        
        await new Promise( (resolve, reject) => {
            // 한 줄씩 읽어들인 후에 발생하는 이벤트
            reader.on('line', function(line) {
                //
                count += 1;
                //console.log("한 줄 읽음 : '" + line + "'");
                line = line.trim();
                
                if( line.length > 0 )
                    ret.add(line);
            });
            
            // 모두 읽어들였을 때 발생하는 이벤트
            reader.on('close', function(line) {
                //console.log('파일을 모두 읽음.');
                resolve();
            });
        });
        return ret;

    }

    static pb_map_to_set(ds){
        let ret = new Set()
        for(const k of Object.keys(ds.items) )
            ret.add(k)
        return ret;
    }

    async read_np_set_from_file(fn) {
        this.word_sets.np_set = await CustomDict.read_dic_file(fn);
        return this;
    }
    async read_cp_set_from_file(fn) {
        this.word_sets.cp_set = await CustomDict.read_dic_file(fn);
        return this;
    }
    async read_vv_set_from_file(fn) {
        this.word_sets.vv_set = await CustomDict.read_dic_file(fn);
        return this;
    }
    async read_va_set_from_file(fn) {
        this.word_sets.va_set = await CustomDict.read_dic_file(fn);
        return this;
    }
    async read_cp_caret_set_from_file(fn) {
        this.word_sets.cp_caret_set = await CustomDict.read_dic_file(fn);
        return this;
    }
    async read_word_set_from_file(set_name, fn) {
        this.word_sets[set_name] = await CustomDict.read_dic_file(fn);
        return this;
    }

    copy_np_set(dict_set) {
        this.word_sets.np_set = dict_set;
        return this;
    } 
    copy_cp_set(dict_set) {
        this.word_sets.cp_set = dict_set;
        return this;
    } 
    copy_cp_caret_set(dict_set) {
        this.word_sets.cp_caret_set = dict_set;
        return this;
    }
    copy_vv_set(dict_set) {
        this.word_sets.vv_set = dict_set;
        return this;
    }
    copy_va_set(dict_set) {
        this.word_sets.va_set = dict_set;
        return this;
    }
    copy_set(set_name, dict_set) {
        this.word_sets[set_name] = dict_set;
        return this;
    }



    async update() {
        return await this.client.async_update(this.opts.domain,
            this.word_sets)
    }

    async get() {
        return await this.client.async_get(this.opts.domain);
    }

    async load() {
        let d = await this.get();
        for( const name of Object.keys(d) ) {
            if( name.endsWith("_set") )
                this.word_sets[name] = CustomDict.pb_map_to_set(d[name]);
        }
        return this;
    }

    async clear() {
        this.word_sets = {};
        return await this.client.async_remove(this.opts.domain);
    }
}

module.exports = CustomDict;