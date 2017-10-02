/* @User Event Script on User Event: Commit

Version 1.20 - added additional if() during line copy that checks if 'UPD Code' is an exception (i.e. 'DISCOUNT') and then passes raw item instead of converting item
Version 1.13 - added default value for 'SOMemo2' since project search executes even if 'if' statement container is false, must be string value to succeed
Version 1.12 - changed 'so.GetFieldValue' to 'so.getFieldValue' on line 53
Version 1.11 - Error handling for missing project fields that were introduced due to project selection and search being skipped for stock SOs
Version 1.10 - Purchase Order Items being marked as 'billable' by default was causing issues with invoicing when all lines appeared as billable items. This is now set to 'false' by default on PO creation.
				- Purchase Orders can now be created for stock transactions, which means they will not have a project selected. This is now appropriately handled when the SO is marked as 'for stock'.
				- Memo is created as 'Purchased for Stock' instead of Project Number, and customer project is skipped when setting line values
				
Remaining steps for current solution:
- deselect 'billable' on every line				DONE NOT TESTED
- Custom memo for stock 						DONE NOT TESTED
- Do not attempt to enter customer if stock		DONE NOT TESTED
*/

function CreatePOfromSO(type) {

//Initialize
//var now = new Date();				Skipping since date defaults to current
//now = nlapiDateToString(now);		Skipping since date defaults to current
var SubsidiaryID = 1;
var CustomForm = 100;
var Vendor = 1364;
var DefaultDepartment = 4;
var DefaultLocation = 5;
var DefaultClass = 3;
var DefaultPOApproval = 1;

//Debugging for Usage ---USAGE---
var Context = nlapiGetContext();
var Usage = getnumber(Context.getRemainingUsage());
nlapiLogExecution('DEBUG','Usage after initializing variables','Usage: '+Usage);

//get internal ID of the Sales Order
var SO_InternalID = Context.getSetting('SCRIPT','custscript_salesorderid');
nlapiLogExecution('debug','SO_InternalID is ', SO_InternalID);

//load the Sales Order record
var so = nlapiLoadRecord('salesorder', SO_InternalID);
		//nlapiLogExecution('debug','SO loaded','');
 
//Validate that the SO is an Xis record with Customer as Kandrea and Location as Xis Edmonton
if(so.getRecordType() == 'salesorder' && so.getFieldValue('subsidiary') == '2' && so.getFieldValue('location') == '11' && so.getFieldValue('entity') == '6190')
	{	
	//Get Required Body Values from SO
	var Department = so.getFieldValue('department');
	if(Department == null) {Department = DefaultDepartment;}
	//var Location = so.nlapiGetFieldValue('Location');			//Need to define rule for Location
	var salesrep = so.getFieldValue('custbody_projectsponsor');	//Needs to be 'sales rep' in sandbox as of 2016/11/10 until sandbox refresh
	var Location = nlapiLookupField('employee',salesrep,'location');
	nlapiLogExecution('debug','Location from Sales Rep is',Location);
	if(Location == null) {Location = DefaultLocation;}				//Setting to company-wide until rule is defined
	nlapiLogExecution('debug','Location is now set to',Location);
	var Class = so.getFieldValue('Class');
	if (Class == null) {Class = DefaultClass;}
	//var CurrentDate = now.dateStamp();		replaced by 'now'

	//Determine if SO is for Stock or for Project
	var SOStockCheckbox = so.getFieldValue('custbody_stockcheckbox');
	var SOProjNumber = so.getFieldValue('custbody_xisprojectnumber');
	
	//Get Optional Body Values from SO
	var SOMemo = '';
	var SOMemo1 = so.getFieldValue('tranid');
	var SOMemo2 = '400';	//Set SOMemo2 to default project number so that search below does not cause error when executing with null parameter and returning no rows
	//Set Memo with logic based on stock or project transaction
	if (SOStockCheckbox =='F') {
		SOMemo2 = so.getFieldValue('custbody_xisprojectnumber');
		var SOMemo3 = so.getFieldValue('custbody_projectname');
		SOMemo = "XisSO: " + SOMemo1 + " Proj#: " + SOMemo2 + " " + SOMemo3;
	} else {
		SOMemo = "XisSO: " + SOMemo1 + " Purchased for Stock";
	}
		
	//Get Internal ID of Project Record for PO Lines
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('entityid',null,'is',SOMemo2);
	nlapiLogExecution('debug','SOMemo2 is + type is',SOMemo2 + " " + typeof(SOMemo2));
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	
	var searchResults = nlapiSearchRecord('job',null,filters,columns);
	nlapiLogExecution('debug','internalid is', searchResults[0].getValue('internalid'));
	var projectID = searchResults[0].getValue('internalid');
	
	//Create New Record
	var po = nlapiCreateRecord('purchaseorder');
	
	/*
	//Debugging for Usage ---USAGE---
	Context = nlapiGetContext();
	Usage = getnumber(Context.getRemainingUsage());
	nlapiLogExecution('DEBUG','Usage After Creating Purchase Order','Usage: '+Usage);
			//nlapiLogExecution('debug','PO Created',po);
	*/
			
	//Copy Required Body Values to PO
	po.setFieldValue('customform',CustomForm);
	po.setFieldValue('entity',Vendor);
	po.setFieldValue('subsidiary',SubsidiaryID);
	po.setFieldValue('department',Department);
	po.setFieldValue('location',Location);
	po.setFieldValue('class', Class);
			//nlapiLogExecution('debug','Line of Business is',Class);
	po.setFieldValue('approvalStatus', DefaultPOApproval);
	//po.setFieldValue('trandate',now);			Skipping since date defaults to current

	//Copy Optional Body Values to PO if they exist
	po.setFieldValue('memo',SOMemo);
	
	
	
			//nlapiLogExecution('debug','Beginning Line Copy','');
	//Copy Item Line Values to PO
	for(var lineNo=1;lineNo <= so.getLineItemCount('item');lineNo++) {
		//if assembly, Xitem, else Item = xitem
		var item = 2266; //Default item to 'Material Cost as per Quote' in case of script errors
		var Xitem = so.getLineItemValue('item','item',lineNo);
		var XitemUPC = nlapiLookupField('item',Xitem,'upccode');
		nlapiLogExecution('debug','Xitem and XitemUPC are: ',Xitem + " " + XitemUPC);
		//Provide escape for items that do not convert
		if (XitemUPC == "DISCOUNT") {    //Should consider error-checking here for item translation failures, equivalent items
			//Items that do not convert
			item = Xitem;
		} else {
			//Items that do convert
			item = nlapiLookupField('item',Xitem,'custitem_kiitemid');    
		}
		nlapiLogExecution('debug','item selection is ',item);
		var quantity = so.getLineItemValue('item','quantity',lineNo);
		var units = so.getLineItemValue('item','units',lineNo);
		var rate = so.getLineItemValue('item','rate',lineNo);
		rate = Math.round(rate * 100) / 100;				//Truncate rate to 2 decimal points
		var description = so.getLineItemValue('item','description',lineNo);
		var taxcode = so.getLineItemValue('item','taxcode',lineNo);
		var amount = so.getLineItemValue('item','amount',lineNo);
		var invoicedisplayname = so.getLineItemValue('item','custcol_invoicedisplayname',lineNo);
														//Should consider taking Item Name/Memo and pushing to PO Memo, keeping TAG#, etc.
		
		//Copy Item Line Values to PO	
		po.selectNewLineItem('item');
		po.setCurrentLineItemValue('item','item',item);
		po.setCurrentLineItemValue('item','quantity',quantity);
		po.setCurrentLineItemValue('item','units',units);
		po.setCurrentLineItemValue('item','rate',rate);
		po.setCurrentLineItemValue('item','description',description);
		po.setCurrentLineItemValue('item','taxcode',taxcode);
		po.setCurrentLineItemValue('item','amount',amount);
		po.setCurrentLineItemValue('item','custcol_invoicedisplayname',invoicedisplayname);
		po.setCurrentLineItemValue('item','department',Department);
		po.setCurrentLineItemValue('item','location',Location);
		po.setCurrentLineItemValue('item','class',Class);
		if (SOStockCheckbox == 'F') {  //Only enter Customer if PO is not for Stock, otherwise skip
			po.setCurrentLineItemValue('item','customer',projectID);
		}
		po.setCurrentLineItemValue('item','isbillable','F');	//Items are billable when a customer is selected by default, and this was causing all blanket to appear as line items for invoicing, so it was disabled in v1.10
		po.commitLineItem('item');
				//nlapiLogExecution('debug','Completed Line Number',lineNo);
				
		//Check if script needs to yield and reschedule
		Context = nlapiGetContext();
		Usage = getnumber(Context.getRemainingUsage());
		if (Usage < 100) {
			nlapiLogExecution('DEBUG','Usage limit approaching while adding line items','Line# : '+lineNo+' of '+so.getLineItemCount('item')+' -- Usage: '+Usage);
			var ys = nlapiYieldScript();
			if (ys.status == 'FAILURE') {
				nlapiLogExecution('ERROR',"Unable to Yield XisSOtoPO " + ys.reason,ys.information);
			}
			nlapiLogExecution('AUDIT',"Resuming XisSOtoPO","No Errors in Yield")
		}
	}
	//End and Commit to NetSuite
	var poID = nlapiSubmitRecord(po,true,false);
			//nlapiLogExecution('debug','Submitted PO',poID);
	var poNumber = nlapiLookupField('purchaseorder',poID,'tranid');
	nlapiSubmitField('salesorder',SO_InternalID,'otherrefnum',poNumber);		//Should test that this is NUMBER, not InternalID
	nlapiLogExecution('debug','Updated SO with PO#',poNumber);
	} else {
		nlapiLogExecution('debug','SO did not pass Criteria',so.getFieldValue('subsidiary') + " " + so.getFieldValue('location') + " " + so.getFieldValue('entity'));
	}
	/*
	//Debugging for Usage ---USAGE---
	Context = nlapiGetContext();
	Usage = getnumber(Context.getRemainingUsage());
	nlapiLogExecution('DEBUG','Final Usage Amount','Usage: '+Usage);
	*/
}

/***********************************************************************************
* Get Number Value
************************************************************************************/
function getnumber(id)
{
	var ret;
	ret = parseFloat(id);
	if(isNaN(ret))
	{
		ret = 0;
	}
	return ret;

}// getnumber