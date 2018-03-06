/*
	backups_by_day
	
        Logic to take the global backups list (updated by UpdateBackups()) and
	create the data properties for displaying the stacked list of backups by day.
        The actual creation of the HTML is done in this function, and not in
	Updater.update_html() as it is a nested set of table elements, which is not
	handled by Updater.update_html(). (We do use Updater.replace_in_dom()).
 */
function backups_by_day_plugin() {
    this.max_days = 7;                                      // number of days to show
    this.backup_box = null;
    this.day_row = null;
    this.update = function(data) {
        var backups = data["backups"] || [];
        // Note: a backup has date, num_files, sizeInBytes, and source
        backups = backups.sort(function(a,b) {return b.date - a.date}); // most recent first
        
        // first, compute total size for last max_days days of backups, as well as totals for each day
        var total_size = 0;
        var max_day = 0;
        var totals_for_days = [];
        for (var date_dex = 0;date_dex < this.max_days; ++date_dex) {totals_for_days[date_dex] = 0;}
        var bdex = 0; // index into backups
        var this_day = new Date();
        this_day.setHours(0);
        this_day.setMinutes(0);
        this_day.setSeconds(0);
        
        // starting with today at midnight, go back in time for max_days (7)
        for (var date_dex = 0; date_dex < this.max_days; ++date_dex, this_day.setDate(this_day.getDate() - 1)) {
            for (bdex = bdex; bdex < backups.length && backups[bdex].date > this_day; ++bdex) {
                //console.log(backups[bdex].date + " > " + this_day + ":" + (backups[bdex].date > this_day));
                total_size += backups[bdex].sizeInBytes;
                totals_for_days[date_dex] += backups[bdex].sizeInBytes;
            }
            if (totals_for_days[date_dex] > max_day)
                max_day = totals_for_days[date_dex];
        }
        //console.log("totals_for_days.length: " + totals_for_days.length);
        
        // get the templates to use for the header and the boxes
        var parent_body = $(".backups_by_day");
        if (!this.day_row)
            this.day_row = parent_body.children("tbody").children("tr").first().detach();
        parent_body.children("tbody").children("tr").detach();
        
        bdex = 0; // reset index
        var total_backups = 0;
        this_day = new Date();
        this_day.setHours(0);
        this_day.setMinutes(0);
        this_day.setSeconds(0);
        for (var date_dex = 0; date_dex < this.max_days; ++date_dex, this_day.setDate(this_day.getDate() - 1)) {
            var new_row = this.day_row.clone();
            var daily_backups = new_row.find(".daily_backups").first();
            var backup_box = daily_backups.find(".backup_box").first().detach();
            var num_backups = 0;
            for (bdex = bdex; bdex < backups.length && backups[bdex].date > this_day; ++bdex) {
                var props = backups[bdex];
                //console.log("backups[bdex].source = " + backups[bdex].source);
                props["width"] = Math.round(100 * backups[bdex].sizeInBytes / max_day);
                props["human_size"] = formatBytes(backups[bdex].sizeInBytes);
                var new_backup = Updater.replace_in_dom(backup_box.clone(), props);
                daily_backups.append(new_backup);
                ++num_backups;
            }
            total_backups += num_backups;
            new_row.children(".day").html(this_day.toString("ddd")); // abbreviated name of day
            new_row.children(".total_size").html(formatBytes(totals_for_days[date_dex])).attr("title", num_backups + " backups");
            parent_body.append(new_row);
        }
        $("#total_num_backups").html(total_backups);
        $("#total_size_summary").html(formatBytes(total_size));
    }
    Updater.registerForBackups(this);
}
new backups_by_day_plugin();


