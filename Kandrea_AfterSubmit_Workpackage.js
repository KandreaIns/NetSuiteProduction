/**
User-Event SuiteScript on AfterSubmit to perform logic for Work Packages on release from saved search

AfterSubmitWFMWorkPackage() 

Execution Order:
 - Load Record
 - Check if marked for release
	- Release Process (Update status, release date, create work package log)
	- Update Start/End Date for all Work Orders if not valid with package start/end date
	
v1.01 - Added Work Package Log on Release Event

**/

//Setup global variables
var DebugString = '';

function AfterSubmitWFMWorkPackage() {
	nlapiLogExecution('DEBUG','AfterSubmitWFMWorkPackagehas been started','---------------------------');

	//Load record
	var WorkPackageRecord = nlapiLoadRecord('customrecord_wfm_workpackage',nlapiGetRecordId());
	var WorkPackageID = WorkPackageRecord.getFieldValue('id');
	var WorkPackageReleased = WorkPackageRecord.getFieldValue('custrecord_wfm_worrkpackage_released');
	var WorkPackageStatus = WorkPackageRecord.getFieldValue('custrecord_wfmworkpackage_status');
	var WorkPackageStartDate = WorkPackageRecord.getFieldValue('custrecord_wfmworkpackage_startdate');
	var WorkPackageDueDate = WorkPackageRecord.getFieldValue('custrecord_wfmworkpackage_duedate');
		
	nlapiLogExecution('DEBUG','AfterSubmitWFMWorkPackage Debugging','WFMWorkPackage has been loaded: ' + WorkPackageRecord.getFieldValue('id'));
	DebugString = DebugString.concat(WorkPackageReleased,'...',WorkPackageReleased=='T','...',WorkPackageStatus,'...',WorkPackageStatus==1);
	nlapiLogExecution('DEBUG','Testing Values',DebugString);
	
	//Check if Work Package has been marked for release
	if (WorkPackageReleased == 'T' && WorkPackageStatus == 1) {
		nlapiLogExecution('AUDIT','Releasing Work Package','Performing Release Update on Work Package ' + WorkPackageID);
		//Prepare Date Value
		var currentDateTime = new Date();
		
		//Update Status and Release Date
		WorkPackageRecord.setDateTimeValue('custrecord_wfmworkpackage_releasedate',nlapiDateToString(currentDateTime,'datetimetz'),12);
		WorkPackageRecord.setFieldValue('custrecord_wfmworkpackage_status',2);
	
		nlapiLogExecution('DEBUG','SUBMITTING RECORD','');
		//Submit Work Package
		var WPSubmit = nlapiSubmitRecord(WorkPackageRecord);
		nlapiLogExecution('DEBUG','SUBMIT COMPLETE','');
		
		//Create Work Package Log for Release Event
		var WPLog = nlapiCreateRecord('customrecord_wfm_workpackagelog');
		WPLog.setFieldValue('custrecord_wfm_wpackagelog_workpackage',WorkPackageID);
		WPLog.setFieldValue('custrecord_wfm_wpackagelog_status',"Released");
		WPLog.setDateTimeValue('custrecord_wfm_wpackagelog_timestamp',nlapiDateToString(currentDateTime,'datetimetz'),12);
		var WPLogSubmit = nlapiSubmitRecord(WPLog);
		
		//Validate and Update Start/Due Date for all Work Orders
		var filters = new Array();
		var columns = new Array();
		filters[0] = new nlobjSearchFilter('custrecord_wfmworkorder_workpackage',null,'is',WorkPackageID);
		columns[0] = new nlobjSearchColumn('internalid');
		columns[1] = new nlobjSearchColumn('custrecord_wfmworkorder_startdate');
		columns[2] = new nlobjSearchColumn('custrecord_wfmworkorder_duedate');
				
		var results = nlapiSearchRecord('customrecord_wfm_workorder',null,filters,columns) || []; //Append empty array if null results to return length of zero
		
		var resultLength = results.length;
			
		//Check if results
		if (resultLength > 0) {
			//Should update work order start and due date if out of range
			for (var x=1; x<=resultLength; x++) {
				var WOID = results[x-1].getValue('internalid');
				var WOStartDate = results[x-1].getValue('custrecord_wfmworkorder_startdate');
				var WODueDate = results[x-1].getValue('custrecord_wfmworkorder_duedate');
				
				if( WOStartDate < WorkPackageStartDate) {
					nlapiSubmitField('customrecord_wfm_workorder',WOID,'custrecord_wfmworkorder_startdate',WorkPackageStartDate);
				}
				
				if( WODueDate > WorkPackageDueDate) {
					nlapiSubmitField('customrecord_wfm_workorder',WOID,'custrecordworkorder_startdate',WorkPackageDueDate);
				}
			}
		} //Else no work orders to update
	} else {
		nlapiLogExecution('AUDIT','Work Package does not meet criteria for release','Work Package ' + WorkPackageID);
	}
}