const a = require("assert"); const { parseId, format } = require("./idcmd");
a.equal(parseId("123456789"), "123456789"); a.equal(parseId(" 42 "), "42");
for (const bad of [undefined, "", "abc", "-5", "0", "12 34", "1.5", "@user", "1234567890123456", "<b>1</b>"]) a.equal(parseId(bad), null, String(bad));
const o = format("7", { first_name: "A<b>", last_name: "Z", username: "az", bio: "hi & bye", active_usernames: ["az", "alt"] }, { joined: 0, downloads: 3, premium: true, lang: "en" });
a(o.includes("A&lt;b&gt; Z")); a(o.includes("@az")); a(o.includes("@alt")); a(o.includes("hi &amp; bye")); a(o.includes("Downloads: 3"));
const n = format("7", null, null); a(n.includes("no profile")); a(n.includes("Not in Zapt"));
console.log("idcmd ok");
