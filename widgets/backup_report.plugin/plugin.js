function backup_report_plugin() {
    this.past_activities = [];
	this.got_activities = false;
    this.sources = [];
    this.sourcesByType = {};
    this.sunburst_items = {};
    this.findActivity = function(source) {
        // this function attempts to do a text search through the mashed together activity source name
        // to find a match. This is a bit finicky and would be better if we could get more information
        // from the activity about the source but that requires a lot of calls during each update
        if (!source || source["volumeName"] == "(null)" || typeof source["volumeName"] != "string" || source["volumeName"].length == 0) {
            return null; // only look at volumes
		}
        
        var isClient = source["isClient"] == "true";
        var isEmail = source["isEmail"] == "true";
        
        // Windows has a parentName with a '/' separating the volume and subvolume, for Mac, subVolParent will always be ""
		var subVolParent = ""
		if (source["parentName"] && source["parentName"].indexOf("/") > 0) {
			subVolParent = source["parentName"].substring(0, source["parentName"].indexOf("/"));
		}
        for (var dex in this.past_activities) {             // look at (and return) most recent activity first
            // the source_name can be "Users on Local Disk (C:)" (Win) or "Users" (Mac)
            // only consider the machine name if source is a client
            var this_activity = this.past_activities[dex];
            var activity_source = this_activity["source_name"];
            if (activity_source.indexOf(source["volumeName"]) == -1)
                continue;                                   // volume name must match in all cases
            if (isClient && activity_source.indexOf(source["machineName"]) == -1) {
                continue;                                   // clients must match machineName
			}
            if (subVolParent.length > 0
                && activity_source.indexOf(subVolParent) == -1) {
                continue;                                   // we have a subvolume and it didn't match
            }
            var activity_is_email = activity_source.indexOf("@") >= 0;
            if (isEmail && !activity_is_email) {
                continue;                                   // activity not for an email source and source is
            }
            if (!isEmail && activity_is_email) {
                continue;                                   // activity is email source and source is not
            }
            return this_activity;
        }
        return null;
    }
    this.itemsChanged = function(new_items) {
        // return true if new_items is different from the cached this.sunburst_items
        // uses objectEquals() defined in dashboard.js
        return !objectEquals(this.sunburst_items, new_items, {keys:["children"]});
    }
    this.pushSource = function(activity_result, machine_name, volume_name) {
        // pushes a machine_name/volume_name to the activity_result section of this.sourceByType
        if (typeof this.sourcesByType[activity_result] == "undefined")
            this.sourcesByType[activity_result] = {};
        if (typeof this.sourcesByType[activity_result][machine_name] == "undefined")
            this.sourcesByType[activity_result][machine_name] = {name:machine_name, parent:null, children:[], total:0, description:"", class_name: activity_result};
        var parent = this.sourcesByType[activity_result][machine_name];
        parent.total += 1;
        parent.children.push({name:volume_name, parent:parent, children:[], total:1, description:"", class_name: activity_result});
    }
    this.update = function(data) {
        if (data["pastActivities"]) {
            this.past_activities = data["pastActivities"].sort(function(a,b) {return b.backup_date - a.backup_date}); // most recent *first*
			this.got_activities = true;
        }
        if (data["sources"]) {
            this.sources = data["sources"];
		}
        if (this.sources.length > 0 && this.got_activities) {
			// go through all sources and find most recent activity. Group sources by activity result (success, fatal, stopped, errors, etc)
			this.sourcesByType = {};
			for (var sdex in this.sources) {
                var source = this.sources[sdex];
                var machine_name = source["machineName"];
                var volume_name = source["volumeName"];
                if (volume_name == "(null)")
                    continue;                               // only look at volumes
				var found_activity = this.findActivity(source);
				if (found_activity) {
					var activity_result = found_activity["activity_result"];
                    this.pushSource(activity_result, machine_name, volume_name);
				}
				else {
					// either unprotected or not yet backed up
                    // it is not at all trivial to determine if a source (subvolume, etc) is in a script, so just go with unprotected
                    // additionally, do not report local volumes or NAS (as they are frequently destinations)
                    var shouldReport = source["isClient"] == "true" || source["isEmail"] == "true" || source["isSubvolume"] == "true";
					if (shouldReport) {
                        this.pushSource("unprotected", machine_name, volume_name);
                    }
				}
			}
			
			// now add all sourcesByType to our root_items for sunburst
            var serverName = Updater.serverName || "Backups";
			var root_items = {name: serverName, description: " ", total: 0, parent:{}, children:[]};
			for (var result_type in this.sourcesByType) {
                // this.sourcesByType[result_type] is a hash of each machine, turn it into an array for children
                var children = []
                var total = 0;
                for (var machine_name in this.sourcesByType[result_type]) {
                    var machine_source = this.sourcesByType[result_type][machine_name];
                    machine_source["parent"] = root_items;
                    children.push(machine_source);
                    total += machine_source.total;
                }
				var item = {};
				item.name = result_type;
				item.parent = root_items;
				item.children = children;
				item.total = total;
                item.description = String(item.total);
                item.class_name = result_type;
				root_items.children.push(item);
				root_items.total += item.total;
			}
			root_items.description = String(root_items.total);
			// root_items.children.sort(function(a, b) { return b.total - a.total });
			
			if (this.itemsChanged(root_items)) {
				this.sunburst_items = root_items;
				createSunburst(".backup_report", root_items, 4);
			}
		}
    }
    Updater.registerForSources(this);
    Updater.registerForPastActivities(this);
}
new backup_report_plugin();
