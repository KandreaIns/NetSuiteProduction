/* @User Event Script on User Event: Commit

Calls next available scheduled script deployment to process sales order into a new purchase order

*/

function CallPOfromSO(type,form) {
	var script_id = 352; //352 in production, 354 in sandbox
	var SO_InternalID = nlapiGetRecordId();
	var params = {'custscript_salesorderid':SO_InternalID};
	nlapiLogExecution('DEBUG','Launching XisSOtoPO','XisSOtoPO is being called on Sales Order '+SO_InternalID);
	var ScheduleStatus = nlapiScheduleScript(script_id,null,params); //Deployment is empty so that script selects first available deployment
	if(ScheduleStatus != 'QUEUED') {
		nlapiLogExecution('ERROR','Error Scheduling Script for XisSOtoPO','Schedule Script Failed for SO with Internal ID '+SO_InternalID+' with script status of '+ScheduleStatus);
	}
}