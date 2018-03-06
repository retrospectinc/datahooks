/*
	storage_list
	
 Logic to take the global storage (updated by UpdateSets()) and create
	the data properties for displaying the Storage Sets list.
 Note that Updater.update_html does the actual HTML creation and updating.
 */
function storage_list_plugin() {
    this.update = function(data) {
        var storage = data["sets"] || [];
        var processed_storage = [];
        for (var sdex = 0; sdex < storage.length; ++sdex) {
            var props = {};
            props.storage_type = storage[sdex].storage_type;
            props.storage_name = storage[sdex].storage_name;
            props.backup_date = shortDateAndTimeFormat(storage[sdex].backup_date);
            props.size_used_human = formatBytes(storage[sdex].size_used);
            props.total_capacity_human = formatBytes(storage[sdex].total_capacity);
            props.percent_used = (storage[sdex].total_capacity == 0) ? 0.0 : (100.0 * storage[sdex].size_used / storage[sdex].total_capacity).toPrecision(3);
            props.warning = (props.percent_used > 90.0) ? "warning" : "";
            processed_storage.push(props);
        }
        // tell server to update our HTML div with recent_list
        Updater.update_html(".storage_list tbody", "tr.template", processed_storage);
    }
    Updater.registerForStorage(this);
}
new storage_list_plugin();
