/*
	activities_list
	
 Logic to take the global activities (updated by UpdateActivities()) and
	create the data properties for displaying the activities list.
 Note that Updater.update_html does the actual HTML creation and updating.
 */

function activities_plugin() {
    this.media_request_icon_counter = 0;                    // used to 'blink' media request icon
    this.update = function(data) {
        var activities = data["activities"] || [];
        this.media_request_icon_counter++;
        var activity_list = [];
        activities.forEach(function(activity) {
            activity_list.push({
               backup_date: shortDateAndTimeFormat(activity.backup_date),
               source_name: activity.source_name,
               destination_name: activity.destination_name,
               script_name: activity.script_name,
               bytes_copied: activity.bytes_copied,
               bytes_remaining: activity.bytes_remaining,
               files_copied: activity.files_copied,
               files_remaining: activity.files_remaining,
               files_total: activity.files_copied + activity.files_remaining,
               percent_copied: (activity.bytes_remaining)
               ? (100.0 * activity.bytes_copied /
                  (activity.bytes_copied + activity.bytes_remaining).toPrecision(2))
               : 0.0,
               status: activity.status,
               activity_type: activity.activity_type,
               pause_or_run: activity.pause_or_run,
               activity_id: activity.activity_id,
               show_status: activity.show_status,
               show_media_request: activity.show_media_request,
               media_request_icon: ((this.media_request_icon_counter % 2 == 0) ? "media_request_one" : "media_request_two"),
               request_op: activity.request_op,
               request_member: activity.request_member,
            });
        });
        
        $(".pause_or_run.icon").unbind();                   // unbind any existing objects before calling Updater.update_html
        $(".stop.icon").unbind();
        Updater.update_html(".activities_list", ".template", activity_list);
        $(".pause_or_run.icon").unbind().click(function() {
                                               var doPause = $(this).hasClass("pause"); // otherwise, run
                                               var activity_id = $(this).attr("id").split("_")[1];
                                               if (doPause) {
                                               window.server.pauseActivity(parseInt(activity_id));
                                               }
                                               else {
                                               window.server.runActivity(parseInt(activity_id));
                                               }
                                               $(this).toggleClass("pause run");
                                               console.log("Pause/run handler for activity #" + activity_id + " called." );
                                               });
        $(".stop.icon").unbind().click(function() {
                                       var activity_id = $(this).attr("id").split("_")[1];
                                       console.log("Stop handler for " + $(this).attr("id") + " called." );
                                       window.server.stopActivity(parseInt(activity_id));
                                       });
    }
    Updater.registerForActivities(this);
}
new activities_plugin();
