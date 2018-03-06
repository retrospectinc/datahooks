function recent_backups_plugin() {
    this.update = function(data) {
        var sources = data["sources"] || [];
        var recent_sources = sources.sort(function(a,b) {return b.backup_date - a.backup_date}); // most recent first
        var recent_list = [];
        for (var sdex = 0; sdex < recent_sources.length; ++sdex) {
            var d = recent_sources[sdex].backup_date;
            var month_ago = new Date();
            month_ago.setDate(month_ago.getDate() - 30);
            if (d && d.valueOf() > 28800000 && d >= month_ago) {  // on Win, default is 0, on Mac, default is 28800000 (1/1/1970)
                recent_list.push({
                                 backup_date: shortDateFormat(d),
                                 source: recent_sources[sdex]["source"],
                                 });
            }
        }
        
        // tell server to update our HTML div with recent_list
        Updater.update_html(".recent_backups tbody", "tr.template", recent_list);
    }
    Updater.registerForSources(this);
}
new recent_backups_plugin();
