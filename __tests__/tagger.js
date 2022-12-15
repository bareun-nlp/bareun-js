
const SRC_DIR="../src/";

let Client = require(SRC_DIR+"BaikalLanguageServiceClient.js");
const conf = require(SRC_DIR+"config.js");

test("empty test",
() => expect(Client.emptyAnalyzeSyntaxResponse()).not.toBeNull()
);
