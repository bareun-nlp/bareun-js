const conf = require("./config.js");
const BaikalLanguageServiceClient = require("./BaikalLanguageServiceClient.js");


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
        return JSON.stringify(this.r, null, beauty ? '  ' : null);
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
            for( s of this.r.sentences )
                for( token of s.tokens )
                    for ( m of token.morphemes )
                        ret.push( Tagged._pos(m, join, detail) ) ;
        else
            for( s of this.r.sentences )
                for( token of s.tokens ) {
                    let t = new Array();                    
                    ret.push(t);
                    for ( m of token.morphemes )
                        t.push( Tagged._pos(m, join, detail) ) ;
                }
        return ret;
    }

    _get_list( item, filter = null ) {
        let ret = new Array();
        for( s of this.r.sentences )
                for( token of s.tokens )
                    for ( m of token.morphemes )
                        if( filter && filter(m) )
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
    custom_dicts = {};
    constructor(host=conf.default.nlp_host, port=conf.default.nlp_port, domain=null) {
        if( typeof host !== "object" ) {
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

    // TODO custom_dict()

    async tag(phrase, auto_split = false) {
        if( !phrase )
            return BaikalLanguageServiceClient.emptyAnalyzeSyntaxResponse();        
        
        if( Array.isArray(phrase) ) {
            phrase = phrase.join("\n");
        }
        return new Tagged(phrase, await this.client.asyncAnalyzeSyntax(phrase, this.domain, auto_split) )
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
        
    }
}