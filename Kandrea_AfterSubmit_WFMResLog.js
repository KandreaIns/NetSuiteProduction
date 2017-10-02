/**
User Event AfterSubmit Script to execute WFM logic based on resource logs

**/

/* Planned Execution Steps

//1 - f() CheckIfDuplicate
//2		- Mark Duplicate
//3 - f() CalculateDuration
//4 - f() UpdateWorkOrder
//5 - Check if Hold Code
//6 	- f() Send Email
//7 - Mark as Updated

*/

//Global Variables

function AfterSubmitWFMResourceLog() {
	
	//Load Record
	var ResourceLog = nlapiLoadRecord('customrecord_wfm_resourcelog',nlapiGetRecordId());
	
	//Verify that Resource Log has been marked for updates
	var RsLog_Marked = ResourceLog.getFieldValue('custrecord_wfm_reslogmarkedforupdate');
	nlapiLogExecution('DEBUG','RsLog Marked Value',RsLog_Marked);
	if (RsLog_Marked === 'T') {
		nlapiLogExecution('DEBUG','Resource Log was marked for update','');
		
		///Load Values
		var RsLog_ID = ResourceLog.getFieldValue('id');
		var RsLog_Resource = ResourceLog.getFieldValue('custrecord_wfm_rlog_resource');
		var RsLog_StartTime = ResourceLog.getFieldValue('custrecord_wfm_rlog_starttime');
		var RsLog_EndTime = ResourceLog.getFieldValue('custrecord_wfm_rlog_endtime');
		var RsLog_Duration = ResourceLog.getFieldValue('custrecord_wfm_rlog_duration');
		var RsLog_Status = ResourceLog.getFieldValue('custrecord_wfm_rlog_status');
		var RsLog_StatusCode = ResourceLog.getFieldValue('custrecord_wfm_rlog_statuscode');
		var RsLog_WorkType = ResourceLog.getFieldValue('custrecord_wfm_rlog_worktype');
		var RsLog_WorkOrder = ResourceLog.getFieldValue('custrecord_wfm_resourcelog_workorder');
		var RsLog_DLogLink = ResourceLog.getFieldValue('custrecord_wfm_resourcelog_dailyloglink');
		var RsLog_Project = ResourceLog.getFieldValue('custrecord_wfm_resourcelog_project'); //Added on 2017/09/26 so that Project can be tested before values are hardcoded
		
		nlapiLogExecution('AUDIT','ResourceLog AfterSubmit script running','Start of Script. ResourceLog ID is '+RsLog_ID);
		
		//Assign Work Order if Status is 'WORKING ON ORDER' and WorkOrder field is empty based on StatusCode - otherwise the script will error out when searching for connected records such as daily logs
		if (RsLog_Status == 'WORKING ON ORDER' && (RsLog_WorkOrder === null || RsLog_WorkOrder == "") && !isNaN(RsLog_StatusCode)) {
			RsLog_WorkOrder = +RsLog_StatusCode; //Return number value of status code string, which should contain a work order id
			ResourceLog.setFieldValue('custrecord_wfm_resourcelog_workorder',RsLog_StatusCode);
		}
		
		if (RsLog_WorkOrder !== null && RsLog_WorkOrder != "") { /** TO FIX Use Project, First Crew of Project, and then LogDate as Date of StartDate**/
			//Lookup Values from Parent Records
			var RsLog_WorkPackage = nlapiLookupField('customrecord_wfm_workorder',RsLog_WorkOrder,'custrecord_wfmworkorder_workpackage');
			var RsLog_Project = nlapiLookupField('customrecord_wfm_workpackage',RsLog_WorkPackage,'custrecord_wfmworkpackage_project');
			var RsLog_PrimaryCrew = nlapiLookupField('customrecord_wfm_workorder',RsLog_WorkOrder,'custrecord_wfm_workorder_primarycrew');
			var Rs_LogDate = GetDateString(RsLog_StartTime);
			
			//Set Values used for reporting
			ResourceLog.setFieldValue('custrecord_wfm_resourcelog_project',RsLog_Project); //Project of Work Package of Work Order
			ResourceLog.setFieldValue('custrecord_wfm_resourcelog_primarycrew',RsLog_PrimaryCrew); //Primary Crew of Work Order
			ResourceLog.setFieldValue('custrecord_wfm_resourcelog_date',Rs_LogDate); //Date of StartTime
		} else if(RsLog_Project !== null && RsLog_WorkOrder != ""){
			//Project value exists without work order. Logs are for tasks or hold codes and need to be connected to project crew and log date of start time.
			var crewFilters = new Array();
			var crewColumns = new Array();

			crewFilters[0] = new nlobjSearchFilter('custrecord_wfmprojectcrew_project',null,'is',RsLog_Project);
			crewColumns[0] = new nlobjSearchColumn('internalid').setSort(false);

			var CrewResults = nlapiSearchRecord('customrecord_wfm_projectcrew',null,crewFilters,crewColumns) || [];
			//Set Resource Log crew to first crew created for project (already sorted in results)
			ResourceLog.setFieldValue('custrecord_wfm_resourcelog_primarycrew',CrewResults[0].getValue('internalid');
			var Rs_LogDate = GetDateString(RsLog_StartTime);
			ResourceLog.setFieldValue('custrecord_wfm_resourcelog_date',Rs_LogDate); //Date of StartTime
		} else {
			/** NEED TO FIX THIS SECTION
			Values are currently hard-coded when a work order has not been selected as otherwise the project value is not coded and this causes errors with the logs in reports.
			Need to determine how this value is passed from the app or if this was never implemented
			Issue does not exist with 'Working on Order' logs as these have a work order value - need to solve for tasks and hold codes
			
			The section has now been replaced by the above section (needs to be tested) and should be refactored to handle edge cases where the project value has failed.
			**/
			var Rs_LogDate = GetDateString(RsLog_StartTime);
			//ResourceLog.setFieldValue('custrecord_wfm_resourcelog_project',10025); //Project 1289
			//ResourceLog.setFieldValue('custrecord_wfm_resourcelog_primarycrew',2); //Main Crew for Project 1289
			ResourceLog.setFieldValue('custrecord_wfm_resourcelog_date',Rs_LogDate); //Date of StartTime
			//ResourceLog.setFieldValue('custrecord_wfm_resourcelog_primarycrew',RsLog_PrimaryCrew); //Primary Crew of Work Order - cant be used as not all logs have work orders. Will source from Project value from app in future version.
		}
		
		//Check if Duplicate Resource Log
		if (true) {				//CheckNotDuplicate(RsLog_Resource,RsLog_EndTime,RsLog_ID)) //Replaced for testing, search is not returning results as expected
			//Resource Log is Not Duplicate
			nlapiLogExecution('DEBUG','RESOURCE LOG NOT DUPLICATE','RESOURCE LOG NOT DUPLICATE');
			
			//Update Duration
			var NewDuration = CalculateDuration(RsLog_EndTime,RsLog_StartTime);
			ResourceLog.setFieldValue('custrecord_wfm_rlog_duration',NewDuration);
			
			//Update Work Order with Accumulated Duration if Work Order connected and log status is 'WORKING ON ORDER'
			if (RsLog_WorkOrder !== null && RsLog_WorkOrder != "" && RsLog_Status == "WORKING ON ORDER") {
				var OldDuration = nlapiLookupField('customrecord_wfm_workorder',RsLog_WorkOrder,'custrecord_wfmworkorder_actualduration');
				var TotalDuration = +NewDuration + +OldDuration; //Unary Operator '+' converts strings to numbers for addition, but returns number as answer
				TotalDuration = TotalDuration.toString(); //Converts from number back to string value
				nlapiLogExecution("DEBUG","Duration Values for Resource Log " + RsLog_ID,"Old Duration: " + OldDuration + " New Duration: " + NewDuration + " TotalDuration: " + TotalDuration);
				nlapiSubmitField('customrecord_wfm_workorder',RsLog_WorkOrder,'custrecord_wfmworkorder_actualduration',TotalDuration);			
			}
			
			//Check if Hold Code, then if need to send email
			if (RsLog_WorkOrder !== null && RsLog_WorkOrder != "") {
				if (RsLog_Status == "ONHOLD" || RsLog_Status == "ON HOLD") {
					nlapiLogExecution('DEBUG','RESOURCE LOG ONHOLD','RESOURCE LOG ONHOLD');
					CheckHoldCode(RsLog_WorkOrder,RsLog_StatusCode,ResourceName);
				}
			}
			
			//Check if needs connection to daily log, and if daily log exists
			nlapiLogExecution('DEBUG','TEST IF DLOGLINK IS EMPTYSTRING OR NULL',(RsLog_DLogLink == '') + ' ' + (RsLog_DLogLink === null));
			if (RsLog_Status == 'WORKING ON ORDER' && (RsLog_DLogLink == '' || RsLog_DLogLink === null)) {
				var ConnectTest = ConnectToDailyLog(RsLog_ID,RsLog_WorkOrder,RsLog_StartTime,RsLog_Duration);
				nlapiLogExecution('AUDIT','Was Resource Log connected to a Daily Log?',ConnectTest.connected);
				ResourceLog.setFieldValue('custrecord_wfm_resourcelog_dailyloglink',ConnectTest.DLog);
			} //else no connection needed
			
		} else {
			nlapiLogExecution('DEBUG','RESOURCE LOG IS A DUPLICATE','RESOURCE LOG IS A DUPLICATE');
			//Resource Log is Duplicate, mark as duplicate and ignore
			ResourceLog.setFieldValue('custrecord_wfm_rlog_duration',0);
			ResourceLog.setFieldValue('custrecord_wfm_rlog_isduplicate','T');
		}
		//Unmark for update. Must be full submit as duplicate check above updates multiple fields for inclusion in this SubmitRecord()
		ResourceLog.setFieldValue('custrecord_wfm_reslogmarkedforupdate','F');
		var SubmitResourceLog = nlapiSubmitRecord(ResourceLog);
		nlapiLogExecution('AUDIT','Resource Log Unmarked for Update','End of Script');
	}
}

function CalculateDuration(EndTime,StartTime) {
	//Returns Duration in Minutes
	nlapiLogExecution('DEBUG','Start and End Times','StartTime: '+StartTime+' EndTime: '+EndTime);
	var EndValue = nlapiStringToDate(EndTime,'datetimetz'); //without ,'datetimetz' it will return time in 12 hour increments, not 24, causing errors with time handling
	var StartValue = nlapiStringToDate(StartTime,'datetimetz'); //without ,'datetimetz' it will return time in 12 hour increments, not 24, causing errors with time handling
	var Duration = Math.max(((EndValue - StartValue)/(1000*60)),1); //Always return 1 if duration is less than 1
	nlapiLogExecution('DEBUG','Duration Value',Duration);
	return Duration;
}

function CheckNotDuplicate(Resource, EndTime,LogId) {
	nlapiLogExecution('DEBUG','Duplicate Check Variables','Resource: '+Resource+' EndTime: '+EndTime+' LogId: '+LogId);
	
	var filters = new Array();
	var columns = new Array();
	filters[0] = new nlobjSearchFilter('custrecord_wfm_rlog_resource',null,'is',Resource);
	filters[1] = new nlobjSearchFilter('custrecord_wfm_rlog_endtime',null,'is',EndTime);
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('custrecord_wfm_rlog_resource');
	columns[2] = new nlobjSearchColumn('custrecord_wfm_rlog_endtime');
	
	var DuplicateResults = nlapiSearchRecord('customrecord_wfm_resourcelog',null,filters,columns) || [];
	
	var DuplicateResultLength = DuplicateResults.length;
	
	//Auditing of Duplicate Results:
	nlapiLogExecution('DEBUG','Count of Duplicate Resource Logs',DuplicateResultLength);
	for(var n=1;n<=Math.min(n,3);n++) {
		//nlapiLogExecution('DEBUG','Duplicate Audit '+n+' -----',DuplicateResults[n-1]);
		nlapiLogExecution('DEBUG','Duplicate Audit '+n+' ----- 1/3 Resource',DuplicateResults[n-1].getValue('custrecord_wfm_rlog_resource'));
		nlapiLogExecution('DEBUG','Duplicate Audit '+n+' ----- 2/3 EndTime',DuplicateResults[n-1].getValue('custrecord_wfm_rlog_endtime'));
		nlapiLogExecution('DEBUG','Duplicate Audit '+n+' ----- 3/3 Id',DuplicateResults[n-1].getValue('internalid'));
	}
	//End of Auditing
	
	//Check if duplicates
	if (DuplicateResultLength > 1) {
		//Resource Log is a duplicate
		return false;
	} else {
		//Resource Log is not a duplicate
		return true;
	}
//Could add error handling here
}

function CheckHoldCode(WorkOrder,StatusCode,ResourceName) {
	//Validate Work Order Connection
	if (WorkOrder !== null && WorkOrder != '') {
		var WorkPackage = nlapiLookupField('customrecord_wfm_workorder',WorkOrder,'custrecord_wfmworkorder_workpackage');
		var Project = nlapiLookupField('customrecord_wfm_workpackage',WorkPackage,'custrecord_wfmworkpackage_project');
		
		var filters = new Array();
		var columns = new Array();
		filters[0] = new nlobjSearchFilter('custrecord_wfm_projectholdcode_project',null,'is',Project);
		filters[1] = new nlobjSearchFilter('name',null,'is',StatusCode); //Previously compared to project hold code but this returned the number of the list selection, need to compare to 'Name' text field
		filters[2] = new nlobjSearchFilter('custrecord_wfm_holdcode_type',null,'is',1); //1 is the ID of 'Resource' in the custom list
		//columns[0] = new nlobjSearchColumn('id');
		columns[0] = new nlobjSearchColumn('custrecord_wfm_projectholdcode_sendemail');
		columns[1] = new nlobjSearchColumn('custrecord_wfm_projectholdcode_email');
		
		var HoldCodeResults = nlapiSearchRecord('customrecord_wfm_projectholdcode',null,filters,columns) || []; //Append empty array if null results to return length of zero
		
		var HoldCodeResultLength = HoldCodeResults.length;
		
		//Check if results
		if (HoldCodeResultLength > 0) {
			//Check if email is necessary
			for (var n=1; n<=HoldCodeResultLength; n++) {
				var currentSendEmail = HoldCodeResults[n-1].getValue('custrecord_wfm_projectholdcode_sendemail');
				var currentEmail = HoldCodeResults[n-1].getValue('custrecord_wfm_projectholdcode_email');
				
				//reset currentEmail to null if empty
				if (currentEmail === "") { currentEmail = null; }
				
				if (currentSendEmail == "T") {
					//Get Email Variables
					var EmailAuthor = 11; //Need User Id
					var EmailRecipient = 11; //First send address
					var EmailSubject = 'Resource has been placed on hold at site for Project ' + Project;
					var EmailBody = 'A Crew Lead has entered a Hold Code of type ' + StatusCode + ' for resource ' + ResourceName + '. Please take any and all actions necessary.';
					var EmailCC = currentEmail;
					
					//Send Email
					nlapiSendEmail(EmailAuthor,EmailRecipient,EmailSubject,EmailBody,EmailCC);
				} //Else Email Not Required
			}
		} //Else no valid hold codes
	} //Else no valid work order
}

function ConnectToDailyLog(RsLog_ID,RsLog_WorkOrder,RsLog_StartTime,RsLog_Duration) {
	//ResourceLog is already assumed connected to work order and not linked to daily log
	//Search for Daily Log, and if found, connect to daily log and increment dailylog totalduration
	
	nlapiLogExecution('DEBUG','TEST SEARCH VALUES',RsLog_WorkOrder);
	
	//var SearchDate = nlapiDateToString(RsLog_StartTime,'date'); //First attempt - error with conversion.
	var DateArray = RsLog_StartTime.split(' ');
	var SearchDate = DateArray[0];
	
	var filters = new Array();
	var columns = new Array();
	filters[0] = new nlobjSearchFilter('custrecord_wfm_dailylog_workorder',null,'is',RsLog_WorkOrder);
	filters[1] = new nlobjSearchFilter('custrecord_wfm_dailylog_date',null,'on',SearchDate);
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nlobjSearchColumn('custrecord_wfm_dailylog_duration');

	var DLogResults = nlapiSearchRecord('customrecord_wfm_dailylog',null,filters,columns) || [];
	var DLogResultLength = DLogResults.length;
	
	//Check if valid daily log, then attach to first valid log - does not matter which daily log it gets attached to as long as it is only one log.
	if(DLogResultLength >= 1) {
		//Increase Duration on Daily Log
		var DLogID = DLogResults[0].getValue('internalid');
		var TotalDuration = +RsLog_Duration + +DLogResults[0].getValue('custrecord_wfm_dailylog_duration');
		nlapiSubmitField('customrecord_wfm_dailylog',DLogID,'custrecord_wfm_dailylog_duration',TotalDuration);
		
		//NO LONGER IN USE - using submitfield on the current record would break the script execution as the record was modified and could not be submitted. Value is now returned as 'DLog'
		//Mark ResourceLog as connected to DailyLog
		//nlapiSubmitField('customrecord_wfm_resourcelog',RsLog_ID,'custrecord_wfm_resourcelog_dailyloglink',DLogID);
		
		//Return True to mark that log was connected successfully
		return {connected:true,DLog:DLogID};
	} //Else no valid dailylogs, no action needed
	return {connected:false,DLog:''};;
}

function GetDateString(NSDateTime) {
	//Converts a NetSuite Date or DateTime object to a Date String in the format 'YYYY/MM/DD'
	var JSdate = nlapiStringToDate(NSDateTime);
	var printDate = JSdate.getFullYear()+'/'+(+JSdate.getMonth()+1)+'/'+JSdate.getDate();
	return printDate;
}