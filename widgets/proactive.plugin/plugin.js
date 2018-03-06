/*
 
 proactive
 
    Display a large icon with a text label representing the current status of Proactive
 
*/
function proactive_plugin() {
    this.update = function(data) {
        var sources = data["proactive"] || [];
        var proactive_status = data["proactive_status"];
        
        $(".large_icon").removeClass().addClass("large_icon " + proactive_status);
        $(".proactive_status").text(proactive_status);
        Updater.update_html(".proactive tbody", ".template", sources);
    }
    Updater.registerForProactive(this);
}
new proactive_plugin();
