/**
User Event AfterSubmit Script to execute WFM logic based on work order logs

**/

/* Planned Execution Steps

//1 - CheckIfZero
//2		- f() Notify Project Manager
//3 - Update Work Order
//4 - Mark as Updated

*/

//Global Variables

function AfterSubmitWFMDailyLog() {
	
	//Load Record
	var DailyLog = nlapiLoadRecord('customrecord_wfm_dailylog',nlapiGetRecordId());
	
	//Verify that Daily Log has been marked for updates
	var DailyLog_Marked = DailyLog.getFieldValue('custrecord_wfm_dlogmarkedforupdate');
	nlapiLogExecution('DEBUG','DailyLog Marked Value',DailyLog_Marked);
	if (DailyLog_Marked === 'T') {
		nlapiLogExecution('DEBUG','Daily Log was marked for update','');
		
		///Load Values
		var DailyLog_ID = DailyLog.getFieldValue('id');
		var DailyLog_Quantity = DailyLog.getFieldValue('custrecord_wfm_dailylog_quantity');
		var DailyLog_WorkOrder = DailyLog.getFieldValue('custrecord_wfm_dailylog_workorder');
		var DailyLog_Memo = DailyLog.getFieldValue('custrecord_wfm_dailylog_memo');
		var DailyLog_Crew = DailyLog.getFieldValue('custrecord_wfm_dailylog_crew');
		var DailyLog_Date = DailyLog.getFieldValue('custrecord_wfm_dailylog_date');
		
		///Lookup Values from Parent Records
		var WorkPackage = nlapiLookupField('customrecord_wfm_workorder',DailyLog_WorkOrder,'custrecord_wfmworkorder_workpackage');
		var Project = nlapiLookupField('customrecord_wfm_workpackage',WorkPackage,'custrecord_wfmworkpackage_project');
		
		///Perform Actions
		
		//Check if Quantity is zero or less, so that Project Manager can be notified
		if (DailyLog_Quantity <= 0) {
			//Notify Project Manager
			NotifyManager(Project,DailyLog_WorkOrder,DailyLog_Crew,DailyLog_Quantity,DailyLog_Memo);
		} else {
			//Update Work Order
			var OldQuantity = nlapiLookupField('customrecord_wfm_workorder',DailyLog_WorkOrder,'custrecord_wfmworkorder_actualquantity');
			var NewQuantity = +DailyLog_Quantity + +OldQuantity; //Unary Operator '+' converts strings to numbers for addition, but returns number as answer
			NewQuantity = NewQuantity.toString(); //Converts from number back to string value
			nlapiSubmitField('customrecord_wfm_workorder',DailyLog_WorkOrder,'custrecord_wfmworkorder_actualquantity',NewQuantity);
		}
		
		//Gather Duration from all work orders for current day
		var TotalDuration = GetTotalLogDuration(DailyLog_ID,DailyLog_WorkOrder,DailyLog_Date);
		DailyLog.setFieldValue('custrecord_wfm_dailylog_duration',TotalDuration);
		
		//Update Daily Log 'Project' field with link from WorkOrder>WorkPackage>Project, used for reporting and sublist view in NetSuite
		DailyLog.setFieldValue('custrecord_wfm_dailylog_project',Project);
		
		//Unmark record for update to prevent running script again
		DailyLog.setFieldValue('custrecord_wfm_dlogmarkedforupdate','F');
		
		//Submit Record with Changes
		var DailyLogSubmit = nlapiSubmitRecord(DailyLog);
	} //Else record not marked for update
}

function GetTotalLogDuration(DailyLog_ID,DailyLog_WorkOrder,DailyLog_Date) {
	//Search Resource Logs, then increase totalduration and mark resourcelogs with dailylog_id
	//Initialize Values
	var TotalDuration = 0;
	//var SearchDate = nlapiDateToString(DailyLog_Date,'date'); //First attempt, errors in conversion.
	var DateArray = DailyLog_Date.split(' ');
	var SearchDate = DateArray[0];
	
	//Perform Search for Resource Logs with Same Date and WorkOrder that have not been connected to a dailylog
	var filters = new Array();
	var columns = new Array();
	filters[0] = new nlobjSearchFilter('custrecord_wfm_resourcelog_workorder',null,'is',DailyLog_WorkOrder);
	filters[1] = new nlobjSearchFilter('custrecord_wfm_resourcelog_dailyloglink',null,'is','');
	filters[2] = new nlobjSearchFilter('custrecord_wfm_rlog_starttime',null,'on',SearchDate);
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('custrecord_wfm_rlog_duration');
	columns[2] = new nlobjSearchColumn('custrecord_wfm_rlog_starttime');
	columns[3] = new nlobjSearchColumn('custrecord_wfm_resourcelog_dailyloglink');

	var RLogResults = nlapiSearchRecord('customrecord_wfm_resourcelog',null,filters,columns) || [];
	var RLogResultLength = RLogResults.length;
	
	//Auditing of RLog Search Results
	nlapiLogExecution('AUDIT','Count of Resource Logs for current Work Order and Date',RLogResultLength);
	
	//Parse through search results, add duration to totalduration, and connect resourcelog to dailylog
	for (var n=1;n<=RLogResultLength;n++) {
		var RLogDLogLink = RLogResults[n-1].getValue('custrecord_wfm_resourcelog_dailyloglink');
		var RLogDuration = RLogResults[n-1].getValue('custrecord_wfm_rlog_duration');
		var RLogID = RLogResults[n-1].getValue('internalid');
		
		//Verify resourceLog is not already connected to a dailylog
		if(RLogDLogLink == '' || RLogDLogLink === null) {
			TotalDuration = +TotalDuration + +RLogDuration;
			nlapiSubmitField('customrecord_wfm_resourcelog',RLogID,'custrecord_wfm_resourcelog_dailyloglink',DailyLog_ID);
		} else {
			//Do Nothing, Log has already been counted			
		}
	}
	nlapiLogExecution('AUDIT','Ending TotalDuration',TotalDuration);
	//Return TotalDuration
	return TotalDuration;
}

function NotifyManager(Project,WorkOrder,Crew,Quantity,Memo) {
	//Get Project Manager
	var ProjectTimeApprover = nlapiLookupField('job',Project,'custentity6');
	//Set other values
	var EmailAuthor = 11; //Need User Id
	var EmailSubject = Crew + ' has entered a daily log with zero quantity for project ' + Project;
	var EmailBody = 'A Daily Log has been created for Project ' + Project + ' with a quantity of zero or less. Please see below for the field details. \nProject: ' + Project + ' Work Order: ' + WorkOrder + ' Crew: ' + Crew + ' Quantity: ' + Quantity + ' Memo: ' + Memo;
	
	//Send Email
	nlapiSendEmail(EmailAuthor,ProjectTimeApprover,EmailSubject,EmailBody,EmailAuthor);
}