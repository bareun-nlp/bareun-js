const conf = require("./config.js");
const BaikalLanguageServiceClient = require("./BaikalLanguageServiceClient.js");
const CustomDictionaryServiceClient = require("./CustomDictionaryServiceClient.js");

class Tagged {
    constructor(phrase, res) {
        this.phrase = phrase;
        this.r = res;
    }

    msg() {
        return this.r;
    }

    sentences() {
        return this.r.sentences;
    }

    as_json() { return this.r; }

    as_json_str(beauty  = false) {
        return JSON.stringify(this.r, null, beauty ? 2 : null);
    }

    print_as_json(out = console) {
        if( typeof out.log === "function") {
            out.log(this.as_json_str(true));
        } else if( typeof out.write === "function") {
            out.write(this.as_json_str(true) + "\n");
        }
    }

    static _pos(m, join, detail) {
        if (join) 
            if (detail) {
                let p = m.probability && m.probability > 0 ? (":" + m.probability) : "";
                let oov = m.out_of_vocab ? ("#"+m.out_of_vocab) : "";
                return m.text.content+"/" + m.tag + p+oov;
            } else {
                return m.text.content+"/" + m.tag;
            }
        else
            if (detail)
                return [ m.text.content,
                    m.tag,
                    m.out_of_vocab,
                    m.probability];
            else
                return [m.text.content, Name(m.tag)]
    }

    pos(flatten = true, join = false, detail = false) {
        let ret = new Array();
        if ( flatten )
            for( const s of this.r.sentences )
                for( const token of s.tokens )
                    for ( const m of token.morphemes )
                        ret.push( Tagged._pos(m, join, detail) ) ;
        else
            for( const s of this.r.sentences )
                for( const token of s.tokens ) {
                    let t = new Array();                    
                    ret.push(t);
                    for ( const m of token.morphemes )
                        t.push( Tagged._pos(m, join, detail) ) ;
                }
        return ret;
    }

    _get_list( item, filter = null ) {
        let ret = new Array();
        for( const s of this.r.sentences )
                for( const token of s.tokens )
                    for ( const m of token.morphemes )
                        if( filter===null || filter(m) )
                            ret.push( item ? item(m) : m );
        
        return ret;
    }

    morphs() {
        return this._get_list( (m) => m.text.content);
    }

    nouns() {
        let NOUNS = ["NNP", "NNG", "NP", "NNB"];
        return this._get_list( (m) => m.text.content,
            (m) => NOUNS.indexOf(m.tag) >= 0  );
    }
    verbs() {       
        return this._get_list( (m) => m.text.content,
            (m) => m.tag === "VV"  );
    }
}


class Tagger {
    opts;
    client;
    dict_client = null;
    custom_dicts = {};
    constructor(host=conf.default.nlp_host, port=conf.default.nlp_port, domain=null) {
        if( typeof host === "string" || host instanceof String ) {
            this.opts = {};
            if( host.indexOf(":") >= 0 ) {
                let arr = host.split(":");
                this.opts.host = arr[0];
                this.opts.port = parseInt(arr[1]);
            }
            else {
                this.opts.host = host;
                this.opts.port = port;
            }
            if( domain ) this.opts.domain = domain;           
        } else {
            this.opts = host;
        }
        this.client = new BaikalLanguageServiceClient(this.opts.host + ":" + this.opts.port);

    }

    set_domain(domain) {
        this.opts.domain = domain;
        return this;
    }

    getDictClient() {
        if( !this.dict_client ) 
            this.dict_client = new CustomDictionaryServiceClient(this.opts.host + ":" + this.opts.port);
        
        return this.dict_client;
    }

    custom_dict(domain) {
        if( domain == null || domain == "" ) 
            throw new Error("invalid domain name for custom dict");
        
        return this.custom_dicts[domain] || 
            (this.custom_dicts[domain] = new CustomDict(domain, this.getDictClient())); 
    }

    async tag(phrase, auto_split = false) {
        if( !phrase )
            return new Tagged( "", BaikalLanguageServiceClient.emptyAnalyzeSyntaxResponse());        
        
        if( Array.isArray(phrase) ) {
            phrase = phrase.join("\n");
        }
        return new Tagged(phrase, await this.client.asyncAnalyzeSyntax(phrase, this.opts.domain, auto_split) )
    }

    async tags(...phrases) {
        let phrase = new Array();
        for( p of phrases ) {
            if( Array.isArray(p) ) {
                for(p1 of p) phrase.push(p1);
            } else if(p) {
                phrase.push(p);
            }
        }
        return tag(phrase)
    }

    async pos(phrase, flatten = true, join=false, detail=false) {
        return this.tag(phrase, flatten, join, detail).pos();
    }

    async morphs(phrase) {
        return this.tag(phrase).morphs();
    }

    async nouns(phrase) {
        return this.tag(phrase).nouns();
    }

    async verbs(phrase) {
        return this.tag(phrase).verbs();
    }
}

module.exports = Tagger;
