(function(root){
 const rules={1:"^I want to\\b",2:"^I have to\\b",3:"^I(?:'|’)d like to\\b",4:"^Can I\\b",5:"^This is\\b",6:"^Let(?:'|’)s(?: not)?\\b",7:"^I feel like\\b",8:"^I used to\\b",9:"^I managed to\\b",10:"^It takes\\b",11:"^It(?:'|’)s worth\\b",12:"^Do you know where\\b",13:"^I need to\\b",102:"^That(?: is|'s|’s)\\b",103:"^I(?: am|'m|’m)\\b",104:"^It(?: is|'s|’s)\\b",105:"^I have\\b(?! to\\b)",106:"^I(?:'|’)ve got\\b(?! to\\b)",107:"^I want\\b(?! to\\b)",109:"^I(?:'|’)d like\\b(?! to\\b)",111:"^I like\\b",112:"^I (?:don't|don’t|do not) like\\b",113:"^My name is\\b",114:"^What(?:'s|’s| is) (?:your|his|her|their)\\b",116:"^These are\\b",117:"^There(?: is|'s|’s)\\b",118:"^There are\\b"};
 const api={expression:(id)=>rules[id]?new RegExp(rules[id],'i'):null,match:(id,text)=>{const re=api.expression(id);return re?re.test(text.trim()):null}};
 if(typeof module!=='undefined')module.exports=api;else root.NasaqStructureRules=api;
})(typeof window!=='undefined'?window:globalThis);
