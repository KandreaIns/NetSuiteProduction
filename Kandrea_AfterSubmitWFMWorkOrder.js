/**
User-Event SuiteScript on AfterSubmit to perform logic for imported Work Orders to connect them to previously imported Work Pacakges for WFM

AfterSubmitWFMWorkOrder()

**/

//Setup global variables

function AfterSubmitWFMWorkOrder() {
nlapiLogExecution('DEBUG','AfterSubmitWFMWorkOrder has been started','---------------------------');

	//Load record
	var WorkOrderRecord = nlapiLoadRecord('customrecord_wfm_workorder',nlapiGetRecordId());
	nlapiLogExecution('DEBUG','AfterSubmitWFMWorkOrder Debugging','WFMWorkOrder has been loaded: ' + WorkOrderRecord.getFieldValue('id'));
	var WFMWO_ID = WorkOrderRecord.getFieldValue('id'); //Returns Internal ID of WFM work order
	nlapiLogExecution('DEBUG','WFMWorkOrder values loaded', 'WFMWO_ID: ' + WFMWO_ID);	
	
	//Verify that Work Order requires connection to WFM Work Packages
	var WFMWO_WorkPackage = WorkOrderRecord.getFieldValue('custrecord_wfmworkorder_workpackage');
	var WFMWO_MTO = WorkOrderRecord.getFieldValue('custrecord_wfm_workorder_mtolink');
	nlapiLogExecution('DEBUG','Field Values for Verification','WorkPackage: ' + WFMWO_WorkPackage + ' ' + (WFMWO_WorkPackage === null) + ' MTOLink: ' + WFMWO_MTO + ' ' + (WFMWO_MTO !== ''));
	
	//---SECTION 1: CONNECT TO WORKPACKAGE ON IMPORT---
	if (WFMWO_WorkPackage === null && WFMWO_MTO !== '') {
		nlapiLogExecution('DEBUG','WFMWorkOrder is ready for update');
			
		//Get Work Package with same MTOLink value
		var WFMWP_ID = GetWorkPackage(WFMWO_MTO);
		
		//Check if valid Work Package, and update Work Order by linking to Work Package
		if (WFMWP_ID > 0) {
			WorkOrderRecord.setFieldValue('custrecord_wfmworkorder_workpackage',WFMWP_ID);
			var WOSubmit = nlapiSubmitRecord(WorkOrderRecord,true,false);
			//nlapiSubmitField('customrecord_wfm_workorder',WFMWO_ID,'custrecord_wfmworkorder_workpackage',WFMWP_ID); - Changed to submit record to trigger work package title sourcing
			nlapiLogExecution('AUDIT','WFMWorkPackage and WFMWorkOrder linked','WFMWorkPackage: ' + WFMWP_ID + ' WFMWorkOrder: ' + WFMWO_ID);
		} else {
			nlapiLogExecution('AUDIT','WFMWorkOrder has not been linked','No valid Work Package was found with matching MTOLink for WFMWorkOrder: ' + WFMWO_ID + ' MTOLink: ' + WFMWO_MTO);
		}
	} else {
		nlapiLogExecution('DEBUG','WorkOrder does not meet criteria','-------');
	}
	
	//---SECTION 2: Call WFM script to handle status changes---
	AfterChangeWFMWorkOrder(WFMWO_ID,WFMWO_WorkPackage);
}
		
function GetWorkPackage(WFMWO_MTO) {
	
	//Search for WFM Work Package with same MTOLink value (set on import)
	var filters = new Array();
	var columns = new Array();
	filters[0] = new nlobjSearchFilter('custrecord_wfm_workpackage_mtolink',null,'is',WFMWO_MTO);
	columns[0] = new nlobjSearchColumn('id');
	
	var results = nlapiSearchRecord('customrecord_wfm_workpackage',null,filters,columns) || []; //Append empty array if null results to return length of zero
	
	var resultLength = results.length;
		
	//Check if results
	if (resultLength > 0) {
		var WFMWP_ID = results[0].getValue('id');
		return WFMWP_ID;
	} else {
		return 0;
	}
}

function AfterChangeWFMWorkOrder(WorkOrderID,WFMWO_WorkPackage) {
	//Get values
	var WorkOrderStatus = nlapiLookupField('customrecord_wfm_workorder',WorkOrderID,'custrecord_wfmworkorder_status');
	var WorkPackage = nlapiLookupField('customrecord_wfm_workorder',WorkOrderID,'custrecord_wfmworkorder_workpackage');
	//Error handling for work package check in case a package has not yet been assigned
	//Checking original work package value to exclude newly linked records
	if (WFMWO_WorkPackage !== null && WFMWO_WorkPackage != "") {
		var WorkPackageStatus = nlapiLookupField('customrecord_wfm_workpackage',WorkPackage,'custrecord_wfmworkpackage_status');
	
		//Check if work order status is cancelled or completed
		if (WorkOrderStatus == 5 || WorkOrderStatus == 6); {
			//Verify that Work Package is not yet cancelled/completed
			if (WorkPackageStatus != 5 && WorkPackageStatus != 6); {
				//Search all Work Orders to see if Work Package can be completed/cancelled
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
			} //Else work package is already completed/cancelled
		} //Else work order is not yet completed/cancelled
	} //Else No work package selected
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