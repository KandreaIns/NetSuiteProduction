/**
User Event AfterSubmit Script to execute WFM logic based on work order logs

**/

/* Planned Execution Steps

//1 - CheckIfHoldCode
//1a- Get Hold Code Details
//2		- SendEmail
//3 - f()CheckIfNewWOLog
//4 - CheckIfLockedWO
//5 - f()UpdateWorkOrder
//6 - CheckIfComplete
//7		- f()UpdateWorkPackage
//8 - Mark as Updated

*/

//Global Variables

function AfterSubmitWFMWorkOrderLog() {
	nlapiLogExecution('DEBUG','Beginning WOL AfterSubmit','-----------^^-------');
	
	//Load Record
	var WOLog = nlapiLoadRecord('customrecord_wfm_workorderlog',nlapiGetRecordId());
		
	//Verify that Work Order Log has been marked for updates
	var WOLog_Marked = WOLog.getFieldValue('custrecord_wfm_wologmarkedforupdate');
	nlapiLogExecution('DEBUG','WOLog Marked Value',WOLog_Marked);
	if (WOLog_Marked === 'T') {
		nlapiLogExecution('DEBUG','WO Log was marked for update','');
		
		///Load Values
		var WOLog_ID = WOLog.getFieldValue('id');
		
		//TEMPORARY STEP - Set WorkOrderLog DateValue to WorkType until PowerApps is redirected
		var TempDateValue = WOLog.getFieldValue('custrecord_wfm_wpl_worktype');
		nlapiSubmitField('customrecord_wfm_workorderlog',WOLog_ID,'custrecord_wfm_workorder_datevalue',TempDateValue);
		var WOLog_DateValue = TempDateValue; //Temporary - Remove when PowerApps is redirected to DateValue instead of WorkType and uncomment the proper sourcing line below
		
		var WOLog_Timestamp = WOLog.getFieldValue('custrecord_wfm_workorderlog_timestamp'); //--DATEVALUE-- Replaced with more accurate value
		//var WOLog_DateValue = WOLog.getFieldValue('custrecord_wfm_workorderlog_datevalue'); //--DATEVALUE-- Added for a more accurate datevalue comparison (numeric instead of date that was truncated to minutes)
		var WOLog_Status = WOLog.getFieldValue('custrecord_wfm_wolog_status');
		var WOLog_StatusCode = WOLog.getFieldValue('custrecord_wfm_wolog_statuscode');
		var WOLog_WorkOrder = WOLog.getFieldValue('custrecord_wfm_workorderlog_workorder');
		
		///Lookup Values from Parent Records
		var WO_Status = nlapiLookupField('customrecord_wfm_workorder',WOLog_WorkOrder,'custrecord_wfmworkorder_status');
		var WO_Timestamp = nlapiLookupField('customrecord_wfm_workorder',WOLog_WorkOrder,'custrecord_wfm_workorder_logtimestamp'); //--DATEVALUE-- Replaced with more accurate value
		var WO_DateValue = nlapiLookupField('customrecord_wfm_workorder',WOLog_WorkOrder,'custrecord_wfm_workorder_datevalue'); //--DATEVALUE-- Added for a more accurate datevalue comparison (numeric, not datetime)
		var WorkPackage = nlapiLookupField('customrecord_wfm_workorder',WOLog_WorkOrder,'custrecord_wfmworkorder_workpackage');
		var Project = nlapiLookupField('customrecord_wfm_workpackage',WorkPackage,'custrecord_wfmworkpackage_project');
		
		///Perform Actions
		
		//If WOLog is for a hold code, check if an email needs to be sent and send email
		if (WOLog_Status == "ONHOLD" || WOLog_Status == "ON HOLD") {
			CheckHoldCode(Project,WOLog_StatusCode);
		}
		
		//Check if timestamp is later than previous update
		if (CheckIfNewWOLog(WOLog_DateValue,WO_DateValue)) { //--DATEVALUE-- Updated to compare datevalue fields instead of timestamp fields
			if (WO_Status != 5 && WO_Status != 6) { //if work order status is not complete or cancelled
				var NewStatus = StatusConverter(WOLog_Status);
				if(NewStatus !== 0) {
					//Status Converted Successfully
					UpdateWorkOrder(WOLog_WorkOrder,NewStatus,WOLog_StatusCode,WOLog_Timestamp,WOLog_DateValue); //--DATEVALUE-- Now has both datevalue and timestamp for updating work order
				} else {
					//Status Converter was unable to convert status
					nlapiLogExecution("ERROR","INVALID WorkOrderLog STATUS","STATUSCONVERTER WAS UNABLE TO CONVERT STATUS. STATUS NOT CHANGED FOR WORK ORDER " + WOLog_WorkOrder);
				}
			} else {
				//Log is complete/cancelled, don't update status
			}
		} else {
			//Log is not new.
		}
		
	//Check if Work Order is Complete/Cancelled, Then Check if all Work Orders Complete/Cancelled for Work Packages
	CheckWorkOrdersComplete(WOLog_WorkOrder,WorkPackage,Project);
	
	//Unmark record for update to prevent running script again
	nlapiSubmitField('customrecord_wfm_workorderlog',WOLog_ID,'custrecord_wologmarkedforupdate','F');
	}
}

//Subfunctions
function CheckHoldCode(Project,WOLog_StatusCode) {
	//Create Search to find Hold Code for Project and StatusCode
	var filters = new Array();
	var columns = new Array();
	filters[0] = new nlobjSearchFilter('custrecord_wfm_projectholdcode_project',null,'is',Project);
	filters[1] = new nlobjSearchFilter('name',null,'is',WOLog_StatusCode); //Previously compared to project hold code but this returned the number of the list selection, need to compare to 'Name' text field
	filters[2] = new nlobjSearchFilter('custrecord_wfm_holdcode_type',null,'is',2); //2 is the ID of 'Work Order' in the custom list
	columns[0] = new nlobjSearchColumn('id');
	columns[1] = new nlobjSearchColumn('custrecord_wfm_projectholdcode_sendemail');
	columns[2] = new nlobjSearchColumn('custrecord_wfm_projectholdcode_email');
	
	HoldCodeResults = nlapiSearchRecord('customrecord_wfm_projectholdcode',null,filters,columns) || []; //Append empty array if null results to return length of zero
	
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
				var EmailSubject = 'Work Order has been placed on hold at site for Project ' + Project;
				var EmailBody = 'A Crew Lead has entered a Hold Code of type ' + WOLog_StatusCode + '. Please take any and all actions necessary.';
				var EmailCC = currentEmail;
				
				//Send Email
				nlapiSendEmail(EmailAuthor,EmailRecipient,EmailSubject,EmailBody,EmailCC);
			} //Else Email Not Required
		}
	} //Else no valid hold codes
}

function CheckIfNewWOLog(NewTimestamp,CurrentTimestamp) {
	nlapiLogExecution('DEBUG','Value of Timestamps for comparison','NewTimestamp: ' + NewTimestamp + ' OldTimestamp: ' + CurrentTimestamp);
	if (NewTimestamp === "") {
		//Work Order has no logs.
		nlapiLogExecution('DEBUG','NO NEW TIMESTAMP','NO NEW TIMESTAMP');
		return true;
	} else if (NewTimestamp > CurrentTimestamp) {
		//New log is more recent than old log
		nlapiLogExecution('DEBUG','TIMESTAMP IS LARGER','TIMESTAMP IS LARGER');
		return true;
	}
	nlapiLogExecution('DEBUG','TIMESTAMP IS SMALLER','TIMESTAMP IS SMALLER');
	return false;
}

function StatusConverter(TextStatus) {
	//Converts Text Status to Number Status for NetSuite
	nlapiLogExecution('DEBUG','Value of TextStatus entering StatusConverter',TextStatus);
	var NumStatus = 0;
	switch(TextStatus) {
		case "WORKING ON ORDER":
			NumStatus = 3;
			break;
		case "INPROGRESS":
			NumStatus = 3;
			break;
		case "ONHOLD":
			NumStatus = 4;
			break;
		case "COMPLETE":
			NumStatus = 5;
			break;
		case "COMPLETED":
			NumStatus = 5;
	}
	nlapiLogExecution('DEBUG','Value of NumStatus Exiting StatusConverter',NumStatus);
	return NumStatus;
}

function UpdateWorkOrder(WOLog_WorkOrder,NewStatus,WOLog_StatusCode,WOLog_Timestamp,WOLog_DateValue) {
	//Load Record
	var WorkOrder = nlapiLoadRecord('customrecord_wfm_workorder',WOLog_WorkOrder);
	
	//Set Field Values
	WorkOrder.setFieldValue('custrecord_wfmworkorder_status',NewStatus);
	WorkOrder.setFieldValue('custrecord_wfm_workorder_statuscode',WOLog_StatusCode);
	WorkOrder.setFieldValue('custrecord_wfm_workorder_logtimestamp',WOLog_Timestamp);
	WorkOrder.setFieldValue('custrecord_wfm_workorder_datevalue',WOLog_DateValue); //--DATEVALUE-- Added update for datevalue field
	
	//Submit Record
	var SubmitWorkOrder = nlapiSubmitRecord(WorkOrder);
	
	nlapiLogExecution("DEBUG","WORK ORDER UPDATED","Work Order #" + WOLog_WorkOrder + " has been updated with a new status and timestamp of " + WOLog_Timestamp);
}

function CheckWorkOrdersComplete(WOLog_WorkOrder,WorkPackage,Project) {
	var WorkOrderStatus = nlapiLookupField('customrecord_wfm_workorder',WOLog_WorkOrder,'custrecord_wfmworkorder_status');
	if (WorkOrderStatus == 5 || WorkOrderStatus == 6) {
		//Work Order is Complete or Closed, Check all Work Orders for Packages
		var WOCancelled = true; //Value of true means all are cancelled
		var WOClosed = true; //Value of true means all are cancelled
		//Search for all Work Orders for this Package
		var filters = new Array();
		var columns = new Array();
		filters[0] = new nlobjSearchFilter('custrecord_wfmworkorder_workpackage',null,'is',WorkPackage);
		columns[0] = new nlobjSearchColumn('internalid');
		columns[1] = new nlobjSearchColumn('custrecord_wfmworkorder_status');
		
		var WOResults = nlapiSearchRecord('customrecord_wfm_workorder',null,filters,columns) || []; //Append empty array if null results to return length of zero
		
		var WOResultLength = WOResults.length;
		
		//Check if results
		if (WOResultLength > 0) {
			for (var x=1; x<=WOResultLength; x++) {
				var currentWOStatus = WOResults[x-1].getValue('custrecord_wfmworkorder_status');
				switch(currentWOStatus) {
					case 6: //If Cancelled, no action necessary
						break;
					case 5: //If Completed, WOClosed stays the same, and WOCancelled set to 'false' to mark that not all are cancelled
						WOCancelled = false;
						break;
					default: //If not cancelled or completed, both WOClosed and WOComplete are set to 'false'
						WOClosed = false;
						WOClosed = false;
				}
			}
			//Evaluate if all are cancelled and/or closed
			if (WOClosed) {
				//All work orders completed or cancelled. Work Package should be complete/cancelled if status not opposite value.
				UpdateWorkPackage(WorkPackage,WOCancelled);
			}// Else Open work orders remain. No status change necessary
		} else {
			nlapiLogExecution("ERROR","WORK ORDER LOOKUP FAILED","Work Order Lookup for Work Package " + WorkPackage + " has returned no results. Unable to verify if all work orders have been closed or cancelled.");
		}
	}
}

function UpdateWorkPackage (WorkPackageID,WOCancelled) {
	//Get Work Package Status
	var WorkPackageRecord = nlapiLoadRecord('customrecord_wfm_workpackage');
	var WorkPackageStatus = WorkPackageRecord.getFieldValue('custrecord_wfmworkpackage_status');
	
	//Check if all were cancelled or if some were complete
	if (WOCancelled) {
		//All Cancelled. If Work Package Status is not Complete, should be set to Cancelled.
		if (WorkPackageStatus != 5) {
			WorkPackageRecord.setFieldValue('custrecord_wfmworkpackage_status',6); //Set to Cancelled
			var WorkPackageSubmit = nlapiSubmitRecord(WorkPackageRecord); //Submit Record
		} //Else record is already completed and no status change needed
	} else {
		//Not all cancelled. If Work Package Status is not Cancelled, should be set to Complete.
		if (WorkPackageStatus != 6) {
			WorkPackageRecord.setFieldValue('custrecord_wfmworkpackage_status',5); //Set to Complete
			var WorkPackageSubmit = nlapiSubmitRecord(WorkPackageRecord); //Submit Record
		} //Else record is already cancelled and no status change needed
	}
	//Could check if all work packages are completed/cancelled here and notify project manager
}