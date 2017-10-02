/**
Client Script to allow trigger of buttons on WFM - Work Package Record
Functions are included for Release, Hold, Unhold, Cancel Package

Work Package Statuses:
1 - NEW
2 - AVAILABLE
3 - INPROGRESS
4 - ONHOLD
5 - COMPLETE
6 - CANCELLED

Future Improvements:
- Add Context check instead of global context variables

**/

//Code to check if production or sandbox
var NSContext = "sandbox"; //sandbox environment
if (nlapiGetContext().getEnvironment() == 'PRODUCTION') {
	NSContext = "na1"; //production environment
}
alert(NSContext);

//Global Variables
//var NSContext = "na1"; //Production Environment
//var NSContext = "sandbox"; //Sandbox Environment


function ButtonRelease() {
	var WorkPackageID = nlapiGetRecordId();
	var WorkPackageStatus = nlapiLookupField('customrecord_wfm_workpackage',WorkPackageID,'custrecord_wfmworkpackage_status');
	if (WorkPackageStatus === '1') {
		//Update Status
		nlapiSubmitField('customrecord_wfm_workpackage',WorkPackageID,'custrecord_wfmworkpackage_status','2');
		//Create WorkPackageLog
		CreateWorkPackageLog(WorkPackageID,'AVAILABLE');
		//Reload Page
		var WPLink = 'https://system.'+NSContext+'.netsuite.com/app/common/custom/custrecordentry.nl?rectype=252&id=' + WorkPackageID;
		window.location.assign(WPLink);
	} else {
		//Alert User of Invalid Status
		alert("The record status is not 'NEW'.\nOnly work packages with a status of 'NEW' can be released.")
	}
}

function ButtonHold() {
	var WorkPackageID = nlapiGetRecordId();
	var WorkPackageStatus = nlapiLookupField('customrecord_wfm_workpackage',WorkPackageID,'custrecord_wfmworkpackage_status');
	if (WorkPackageStatus === '3' || WorkPackageStatus === '2') {
		//Update Status
		nlapiSubmitField('customrecord_wfm_workpackage',WorkPackageID,'custrecord_wfmworkpackage_status','4');
		//Create WorkPackageLog
		CreateWorkPackageLog(WorkPackageID,'ONHOLD');
		//Reload Page
		var WPLink = 'https://system.'+NSContext+'.netsuite.com/app/common/custom/custrecordentry.nl?rectype=252&id=' + WorkPackageID;
		window.location.assign(WPLink);
	} else {
		//Alert User of Invalid Status
		alert("The record status is not 'INPROGRESS' or 'AVAILABLE'.\nOnly work packages with a status of 'INPROGRESS' or 'AVAILABLE' can be placed on hold.")
	}
}

function ButtonUnhold() {
	var WorkPackageID = nlapiGetRecordId();
	var WorkPackageStatus = nlapiLookupField('customrecord_wfm_workpackage',WorkPackageID,'custrecord_wfmworkpackage_status');
	if (WorkPackageStatus === '4') {
		//Update Status
		nlapiSubmitField('customrecord_wfm_workpackage',WorkPackageID,'custrecord_wfmworkpackage_status','3');
		//Create WorkPackageLog
		CreateWorkPackageLog(WorkPackageID,'INPROGRESS');
		//Reload Page
		var WPLink = 'https://system.'+NSContext+'.netsuite.com/app/common/custom/custrecordentry.nl?rectype=252&id=' + WorkPackageID;
		window.location.assign(WPLink);
	} else {
		//Alert User of Invalid Status
		alert("The record status is not 'ONHOLD'.\nOnly work packages with a status of 'ONHOLD' can be unheld.")
	}
}

function ButtonCancel() {
	var WorkPackageID = nlapiGetRecordId();
	var WorkPackageStatus = nlapiLookupField('customrecord_wfm_workpackage',WorkPackageID,'custrecord_wfmworkpackage_status');
	var r = confirm("Are you sure you want to cancel this Work Package?")
	if (r === true) {
		//Update Status
		nlapiSubmitField('customrecord_wfm_workpackage',WorkPackageID,'custrecord_wfmworkpackage_status','6');
		//Create WorkPackageLog
		CreateWorkPackageLog(WorkPackageID,'CANCELLED');
		//Reload Page
		var WPLink = 'https://system.'+NSContext+'.netsuite.com/app/common/custom/custrecordentry.nl?rectype=252&id=' + WorkPackageID;
		window.location.assign(WPLink);
	}
}

function CreateWorkPackageLog(WorkPackageID,StatusText) {
	//Get current time in NetSuite format
		var CurrentTime = new Date();
		//Create Work Package Log, update and then submit
		var WorkPackageLog = nlapiCreateRecord('customrecord_wfm_workpackagelog');
		WorkPackageLog.setFieldValue('custrecord_wfm_wpackagelog_status',StatusText);
		WorkPackageLog.setFieldValue('custrecord_wfm_wpackagelog_timestamp',CurrentTime);
		WorkPackageLog.setFieldValue('custrecord_wfm_wpackagelog_workpackage',WorkPackageID);
		var SubmitWPLog = nlapiSubmitRecord(WorkPackageLog);
		nlapiLogExecution('DEBUG','New WPLog created for package '+StatusText,'Work Package Log: ' + SubmitWPLog);
}