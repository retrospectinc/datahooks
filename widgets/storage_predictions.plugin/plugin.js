function storage_predictions_plugin() {
    this.sets = {};
    this.set_count = 0;
    this.past_activities = [];
    this.has_updated = false;
    this.daysAgo = function(date, days) {
        return new Date(date - (days * 1000*60*60*24));
    }
    this.daysBetween = function(date1, date2) {
        return Math.round((date1-date2)/(1000*60*60*24));
    }
    this.weeksBetween = function(date1, date2) {
        var days = this.daysBetween(date1, date2);
        return Math.round(days / 7);
    }
    this.compare_hashes = function(left_hash, right_hash) {
        if (typeof left_hash == "undefined" || typeof right_hash == "undefined")
            return false;
        // fast and loose check that assumes keys are the same and that values are primitives (strings and numbers)
        for (var key in left_hash) {
            if (left_hash[key] != right_hash[key])
                return false;
        }
        return true;
    }
    this.update_sets = function(set_data) {
        // this will update this.sets and this.set_count and return true if any changes were made
        var sets_changed = false;
        if (typeof set_data == "undefined")
            return sets_changed;
        var new_set_count = set_data.length;
        var new_sets = {};
        for (var sdex = 0; sdex < new_set_count; sdex++) {
            var set = set_data[sdex];
            var set_name = set["storage_name"];
            // 0 is 'now', 1-4 is prior 4 weeks, -1 will be next week, -4 will be next month (four weeks from now)
            new_sets[set_name] = {
            storage_name:set_name,
            storage_type: set["storage_type"],
            groom: set["can_groom"],
            capacity: set["total_capacity"],
                0: set["size_used"]};
            if (!this.compare_hashes(new_sets[set_name], this.sets[set_name])) // new_sets must be first parameter (to test "is in")
                sets_changed = true;
        }
        if (this.set_count != new_set_count)
            sets_changed = true;
        
        // now copy over the newly created sets - this takes care of the cases where a set goes away
        this.set_count = new_set_count;
        this.sets = new_sets;
        return sets_changed;
    }
    this.update_activities = function(activity_data) {
        var activities_changed = false;
        if (typeof set_data == "undefined")
            return activities_changed;
        var new_activities = activity_data.sort(function(a,b) {return b.backup_date - a.backup_date});
        activities_changed = new_activities.length != this.past_activities.length;
        if (!activities_changed) {
            // check each entry
            for (var dex in new_activities) {
                if (!this.compare_hashes(this.past_activities[dex], new_activities[dex])) {
                    activities_changed = true;
                    break;                                      // no need to keep going
                }
            }
        }
        this.past_activities = new_activities;
        return activities_changed;
    }
    this.update = function(data) {
        var sets_changed = this.update_sets(data["sets"]);
        var activities_changed = this.update_activities(data["pastActivities"]);
        
        if (this.has_updated && sets_changed == false && activities_changed == false)
            return;                                         // no need to spend time calculating anything
        if (this.set_count > 0) {
            
            var today = new Date();
            for (var storage_name in this.sets) {
				var set = this.sets[storage_name]; // get hash from update of sets above
				set[1] = set[2] = set[3] = set[4] = set[-1] = set[-4] = 0; // reset statistics
                // go through all past_activities until we run out, are > 28 days old, or hit a groom or reset
                for (var pdex = 0; pdex < this.past_activities.length; pdex++) {
                    var activity = this.past_activities[pdex];
                    if (activity["destination_name"] != storage_name)
                        continue;
                    if (activity["activity_type"] == "groom")
                        break;
                    weeks_between = this.weeksBetween(today, activity["backup_date"]) + 1; // +1 to convert 0-n to 1-n+1
                    if (weeks_between < 0)
                        continue;                           // invalid
                    if (weeks_between > 4)
                        break;
                    if (activity["bytes_copied"] > 0)       // skip nulls and invalid data
                        this.sets[storage_name][weeks_between] += activity["bytes_copied"];
                }
                // now that we have all the data for this set, figure out the prediction for next week and next month
                var total = 0;
                var non_zero_weeks = 0;
                for (var week_no = 1; week_no <= 4; week_no++) {
                    if (this.sets[storage_name][week_no] > 0) {
                        non_zero_weeks++
                        total += this.sets[storage_name][week_no];
                    }
                }
                var week_avg = total;
                if (non_zero_weeks > 0)
                    week_avg /= non_zero_weeks;
                this.sets[storage_name][-1] = this.sets[storage_name][0] + week_avg;
                this.sets[storage_name][-4] = this.sets[storage_name][0] + week_avg * 4;
                
                // now compute the actual size it would have been, vs the amount added
                for (var week_no = 1; week_no <= 4; week_no++)
                    this.sets[storage_name][week_no] = this.sets[storage_name][week_no - 1] - this.sets[storage_name][week_no];
                
                // set class name based on how close the usage is to capacity
                this.sets[storage_name]["next_week_class"] = "";
                this.sets[storage_name]["next_month_class"] = "";
                var capacity = this.sets[storage_name]["capacity"];
                if (capacity > 0) {
                    var next_weeks_usage = this.sets[storage_name][-1];
                    var percent = next_weeks_usage / capacity;
                    if (percent > 1.0)
                        this.sets[storage_name]["next_week_class"] = "error";
                    else if (percent > .9)
                        this.sets[storage_name]["next_week_class"] = "warning";
                    
                    // now do next month
                    var next_months_usage = this.sets[storage_name][-4];
                    percent = next_months_usage / capacity;
                    if (percent > 1.0)
                        this.sets[storage_name]["next_month_class"] = "error";
                    else if (percent > .9)
                        this.sets[storage_name]["next_month_class"] = "warning";
                }
            }
			// tell server to update our HTML div with data, first get human dates
            var this_week = today.toLocaleDateString();
            var one_week_ago = this.daysAgo(today, 7).toLocaleDateString();
            var two_weeks_ago = this.daysAgo(today, 14).toLocaleDateString();
            var three_weeks_ago = this.daysAgo(today, 21).toLocaleDateString();
            var four_weeks_ago = this.daysAgo(today, 28).toLocaleDateString();
            var next_week = this.daysAgo(today, -7).toLocaleDateString();
            var next_month = this.daysAgo(today, -28).toLocaleDateString();
            // $(".storage_predictions th.this_week").text(this_week); // use html version (Today, Next Week and Next Month)
            $(".storage_predictions th.one_week_ago").text(one_week_ago);
            $(".storage_predictions th.two_weeks_ago").text(two_weeks_ago);
            $(".storage_predictions th.three_weeks_ago").text(three_weeks_ago);
            $(".storage_predictions th.four_weeks_ago").text(four_weeks_ago);
            // $(".storage_predictions th.next_week").text(next_week);
            // $(".storage_predictions th.next_month").text(next_month);
            
            // convert hash to array
            var set_data = [];
            for (var storage_name in this.sets) {
                set_data.push({
                              storage_name: storage_name,
                              storage_type: this.sets[storage_name]["storage_type"],
                              this_week:formatBytes(this.sets[storage_name][0], 3),
                              one_week_ago:formatBytes(this.sets[storage_name][1], 3),
                              two_weeks_ago:formatBytes(this.sets[storage_name][2], 3),
                              three_weeks_ago:formatBytes(this.sets[storage_name][3], 3),
                              four_weeks_ago:formatBytes(this.sets[storage_name][4], 3),
                              next_week:formatBytes(this.sets[storage_name][-1], 3),
                              next_month:formatBytes(this.sets[storage_name][-4], 3),
                              next_week_class: this.sets[storage_name]["next_week_class"],
                              next_month_class: this.sets[storage_name]["next_month_class"],
                });
            }
            Updater.update_html(".storage_predictions tbody", "tr.template", set_data);
            this.has_updated = true;                        // we have at least updated once
        }
    }
    Updater.registerForStorage(this);
    Updater.registerForPastActivities(this);
}
new storage_predictions_plugin();
