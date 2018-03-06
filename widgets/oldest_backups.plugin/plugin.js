function oldest_backups_plugin() {
    this.update = function(data) {
        var sources = data["sources"] || [];
        sources = sources.sort(function(a,b) {return a.backup_date - b.backup_date}); // oldest first
        var seven_days_ago = new Date();
        seven_days_ago.setDate(seven_days_ago.getDate() - 7);
        
        
        var oldest_list = [];
        for (var sdex = 0; sdex < sources.length; ++sdex) {
            if (sources[sdex].backup_date <= seven_days_ago) {
                oldest_list.push({
                                 backup_date: shortDateFormat(sources[sdex].backup_date),
                                 source: sources[sdex]["source"],
                                 });
            }
        }
        // tell server to update our HTML div with recent_list
        Updater.update_html(".oldest_backups tbody", "tr.template", oldest_list);
    }
    Updater.registerForSources(this);
}
new oldest_backups_plugin();
