/** Kandrea OppToProj Convert
Client Script called by button for Opportunity records

This script should create a new Project from an Opportunity record
and return a link to the new record

A button script that is deployed to the Opportunity and triggers this script.

FUTURE IMPROVEMENTS
 - Force Hyperlink to be Context Sensitive
 - Add Error Handling for Project Task Creation

Version 1.30 - Added error handling for project task creation as well as validity checks for resources before attempting to add to the project task. Made hyperlink context sensitive for page redirect.
Version 1.24 - Fixed issue with Project Billing Type where 'Fixed Bid Milestone' was submitting as 'FM' but the valid input was 'FBM'
Version 1.23 - Updated page reload logic to direct user to newly created record instead of reloading existing record
Version 1.22 - Added page reload on success to provide visual feedback to user
Version 1.21 - Added 'Start Date' to required fields before project conversion
Version 1.20 - Modified to include CreateProjectTask()
Version 1.10 - Added handling for Time and Material vs Fixed Bid Jobs to select the correct custom form and pre-fill default values.
Version 1.05 - Added array to store values of all 10 preference defaults, and added lines to set values for the preferences
Version 1.04 - Added optional fields 'Safety Employees' and 'Quality Employees', and fixed conversion issues with Client Location and Planned End Date
Version 1.03 - Added error handling for Project Billing Type of 'Standard' on Opportunity, will no longer attempt to convert and break project creation
Version 1.02 - Modified the error when a project already exists to return project number instead of internal ID
Version 1.01 - Updated to reflect all necessary optional fields
**/

//Get Context of Sandbox or Production
var NSContext = "sandbox"; //sandbox value
if(nlapiGetContext().getEnvironment() == 'PRODUCTION') {NSContext = "na1";} //production value

//Get Email Variables for Error Notification
var EmailAuthor = 11; //Need User Id - hardcoded to Matt Rudy
var EmailRecipient = 11; //First send address - hardcoded to Matt Rudy
var EmailSubject = 'SuiteScript Error Alert for ConvertToProject() in ' + NSContext;
var EmailBody = 'Error: Body was not populated by script.';

/** Main Function **/
function ConvertToProject() {
//alert ("ConvertToProject Started");

//Require confirmation from User
var r = confirm("Are you sure you want to create a Project?");
if (r === true) {
	//Initialize
	var CustomForm = 57; //Default to Upaya Simple form in case TandM/Fixed check later on fails
	var BillingStatus = 1;
	var ProjectLabourExpenseType = 1;
	var OppStatus = 23;
	var ProjStatus = 5; //'Awarded' as default status
	var WinLoss = 1;
	var ProjSubsidiary = 1;
	var ProjPercentComplete = 1;
	var BillingTypeArray = ["","","TM","FBI","FBM"] //Array used to translate the numbers returned from opportunity to the strings used on project
	var PreferenceArray = ["T","T","F","T","T","F","T","T","F","F"] //Array used to set the values for 10 project preferences
	
	//get Internal ID of the Opportunity record
	var Opp_InternalID = nlapiGetRecordId();
	nlapiLogExecution('debug','Beginning conversion of Opp #',Opp_InternalID);
	
	//load the Opportunity Record
	var opp = nlapiLoadRecord('opportunity',Opp_InternalID);
	
	//validate that the Opp is ready for conversion
	var CheckProjNum = opp.getFieldValue('job');
	if(nlapiGetRecordType() == 'opportunity' && CheckProjNum == null) {
		var CheckPrimaryContact = opp.getFieldValue('custbody_primarycontact');
		var CheckTimeApprover = opp.getFieldValue('custbody_projectsponsor');
		var CheckStartDate = opp.getFieldValue('custbody_projectstartdate');
		var CheckBillingType = opp.getFieldValue('custbody_projectbillingtype');
		if(CheckPrimaryContact == null || CheckTimeApprover == null || CheckStartDate == null) {
			alert("Please enter values for Primary Contact, Kandrea Sponsor, and Start Date before converting this record.\n\nPrimary Contact = "
			+ CheckPrimaryContact + "\nKandrea Sponsor = " + CheckTimeApprover+ "\nStart Date = " + CheckStartDate);
			} else if (CheckBillingType == 1) {
			alert("Project Billing Type cannot be 'Standard'");
			} else {
			//Ready for conversion
			//Get required Body Values from Opportunity
			var Company = opp.getFieldValue('entity');
			var ProjectName = opp.getFieldValue('title');
			var ProjDepartment = opp.getFieldValue('department');
			var ProjLocation = opp.getFieldValue('location');
			var ProjClass = opp.getFieldValue('class');
			var ProjType = opp.getFieldValue('custbody_estimateowner');
			var ProjBillingType = opp.getFieldValue('custbody_projectbillingtype');
			var ProjContact = opp.getFieldValue('custbody_primarycontact');
			var ProjOwner = opp.getFieldValue('custbody_projectowner');
			var ProjStartDate = opp.getFieldValue('custbody_projectstartdate');
			
			//Get optional Body Values from Opportunity
			var ProjProvince = opp.getFieldValue('custbody_canadaprovince');
			var ProjSalesRep = opp.getFieldValue('salesrep');
			var ProjBudget = opp.getFieldValue('projectedtotal');
			var ProjNumDrawings = opp.getFieldValue('custbody_numberofdrawings');
			var ProjNumBlankets = opp.getFieldValue('custbody_numberofblankets');
			var ProjNumBuildings = opp.getFieldValue('custbody_numberofbuildings');
			var ProjValBlankets = opp.getFieldValue('custbody_valueofblankets');
			var ProjValBuildings = opp.getFieldValue('custbody_valueofbuildings');
			var ProjBidNumber = opp.getFieldValue('tranid');
			var ProjCrewSize = opp.getFieldValue('custbody_crewsize');
			var ProjManDays = opp.getFieldValue('custbody_mandays');
			var ProjMemo = opp.getFieldValue('memo');
			var ProjEndDate = opp.getFieldValue('custbody_projectenddate');
			var ProjClientLocation = opp.getFieldValue('custbody_projectlocation');
			var ProjSafetyEmployee = opp.getFieldValue('custbody_safetyemployees');
			var ProjQualityEmployee = opp.getFieldValue('custbody_qualityemployees');
			
			//Create New Project Record
			var proj = nlapiCreateRecord('job');
			nlapiLogExecution('debug','Begun Project Creation for Opp#',Opp_InternalID);
			
			//Select Project Custom Form, Percent Complete, etc. based on Project Billing Type (Added in Version 1.10)
			if(CheckBillingType == 2) {
				CustomForm = 66;	//Time and Material Form
				ProjPercentComplete = 100; //Set to fully complete if TandM
				} else { CustomForm = 67;}	//Fixed Bid Form
			
			//Copy Required Body Values to Project
			proj.setFieldValue('customform',CustomForm);
			proj.setFieldValue('parent',Company);
			proj.setFieldValue('subsidiary',ProjSubsidiary);
			proj.setFieldValue('custentity_project_department',ProjDepartment);
			proj.setFieldValue('custentity_proj_location',ProjLocation);
			proj.setFieldValue('custentity_proj_line_of_business',ProjClass);
			proj.setFieldValue('custentity12',BillingStatus);
			proj.setFieldValue('projectexpensetype',ProjectLabourExpenseType);
			proj.setFieldValue('jobbillingtype',BillingTypeArray[ProjBillingType]);
			proj.setFieldValue('companyname',ProjectName);
			proj.setFieldValue('custentity6',CheckTimeApprover);
			
			//Copy Optional Body Values to Project
			proj.setFieldValue('entitystatus',ProjStatus);
			proj.setFieldValue('jobtype',ProjType);
			proj.setFieldValue('custentity_budget',ProjBudget);
			proj.setFieldValue('custentity_project_pct_complete',ProjPercentComplete);
			proj.setFieldValue('custentity_projectprovince',ProjProvince);
			proj.setFieldValue('custentity_projectsalesrep',ProjSalesRep);
			proj.setFieldValue('custentity_projectplannedenddate',ProjEndDate);
			proj.setFieldValue('custentity_numberofdrawings',ProjNumDrawings);
			proj.setFieldValue('custentity_numberofblankets',ProjNumBlankets);
			proj.setFieldValue('custentity_numberofbuildings',ProjNumBuildings);
			proj.setFieldValue('custentity_valueofblankets',ProjValBlankets);
			proj.setFieldValue('custentity_valueofbuildings',ProjValBuildings);
			proj.setFieldValue('custentity_primarycontact',ProjContact);
			proj.setFieldValue('custentity_projectowner',ProjOwner);
			proj.setFieldValue('startdate',ProjStartDate);
			proj.setFieldValue('custentity_bidnumber',ProjBidNumber);
			proj.setFieldValue('custentity_crewsize',ProjCrewSize);
			proj.setFieldValue('custentity_mandays',ProjManDays);
			proj.setFieldValue('custentity_internaldescription',ProjMemo);
			proj.setFieldValue('custentity_clientlocation',ProjClientLocation);
			proj.setFieldValue('custentity_safetyemployees',ProjSafetyEmployee);
			proj.setFieldValue('custentity_qualityemployees',ProjQualityEmployee);
			
			//Set Project Preferences
			proj.setFieldValue('allowtime',PreferenceArray[0]);
			proj.setFieldValue('allowallresourcesfortasks',PreferenceArray[1]);
			proj.setFieldValue('limittimetoassignees',PreferenceArray[2]);
			proj.setFieldValue('isutilizedtime',PreferenceArray[3]);
			proj.setFieldValue('isproductivetime',PreferenceArray[4]);
			proj.setFieldValue('isexempttime',PreferenceArray[5]);
			proj.setFieldValue('allowexpenses',PreferenceArray[6]);
			proj.setFieldValue('materializetime',PreferenceArray[7]);
			proj.setFieldValue('includecrmtasksintotals',PreferenceArray[8]);
			proj.setFieldValue('allowtasktimeforrsrcalloc',PreferenceArray[9]);
			
			//Commit to NetSuite
			var projID = nlapiSubmitRecord(proj,true,false);
			var projNum = nlapiLookupField('job',projID,'entityid');
			nlapiLogExecution('Audit','Project record created successfully', 'ID = ' + projID);
			
			//Return Project Number to Opportunity record and change status to Closed - Won
			nlapiSubmitField('opportunity',Opp_InternalID,'job',projID);
			nlapiSubmitField('opportunity',Opp_InternalID,'entitystatus',OppStatus);
			nlapiSubmitField('opportunity',Opp_InternalID,'winlossreason',WinLoss);
			nlapiSubmitField('opportunity',Opp_InternalID,'probability',100); //Mark Opportunity as Complete, will stay open otherwise even if status changes
			
			//Trigger Project Task Creation Here
			//Added Error Handling in Version 1.30 on 2017/09/21
			try{
				alert("1");
				CreateProjectTask(projID);
			}
			catch(e){
				alert("-1: Error Caught");
				//Raise Error
				nlapiLogExecution('ERROR','ConvertOppToProj() Client Script has an encountered an error.',e);
				
				//Update Email Body and Send Email
				EmailBody = 'The SuiteScript function "ConvertToProject()" has failed while attempting to create a project task in the '+NSContext+' environment. Please review the error logs and identify the source of the error.';
				nlapiSendEmail(EmailAuthor,EmailRecipient,EmailSubject,EmailBody);
			}
			
			alert("Project has been created! ID# " + projNum);
			
			/**
			//LEGACY CODE - Previously this script reloaded the current opportunity record on success. It was updated to load the new project record on 2017/05/31 in version 1.23
			
			//Reload Page to show Opportunity Link
			var OppLink = 'https://system.na1.netsuite.com/app/accounting/transactions/opprtnty.nl?id=' + Opp_InternalID;
			window.location.assign(PWLink);
			**/
			
			//Navigate to new Project
			//var ProjLink = 'https://system.na1.netsuite.com/app/accounting/project/project.nl?id=' + projID; //LEGACY VERSION - Replaced with context sensitive link
			var ProjLink = 'https://system.' + NSContext + '.netsuite.com/app/accounting/project/project.nl?id=' + projID; //NEW VERSION - context sensitive link
			window.location.assign(ProjLink);
			
			}
		} else { alert("Project " + nlapiLookupField('job',CheckProjNum,'entityid') + " has already been created for this record.");}
	} else { alert("You have cancelled Project conversion"); }
}

function CreateProjectTask(ProjectID) {
	
	alert("2");
	
	//Initialize Variables
	var PTStatus = "PROGRESS"; //Fill with reference to project task status
	var ResourceServiceItem = 404; //ID of "Regular Time"
	var EquipmentServiceItem = 611; //ID of "Equipment Hourly Rate"
	var EstimatedWork = 1;
	var PTForm = 46;
	var PTBillable = "T"; //Should be True by default (true = selected = nonbillable, for fixed bids)
	var PTConstraint = "ASAP";
	var LineOfBusinessPlaceholder = ["Insulation"];	//Insulation,HeatTrace,Blankets,Buildings - Will hold values until checkboxes exist on OppToProjectConvert
	var TestNotes = "Autocreated via script from Project with Internal ID " + ProjectID;
	
	alert("3");
	
	//Get ProjectID, BillingType, LineOfBusiness Checkbox States
	var project = nlapiLoadRecord('job',ProjectID);
	var projectBillingType = project.getFieldValue('jobbillingtype');
	if(projectBillingType == "TM") {PTBillable = "F";} //If Time and Material Project, overwrite to (false = unselected = billable)
	var projectLocation = project.getFieldValue('custentity_proj_location');
	
	alert("4");
	
	//Create Array of Resources for given location via search
	/** FUTURE IMPROVEMENT - IF MB, Need to include resources from EST AND MB **/
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('isinactive',null,'is',"F");
	filters[1] = new nlobjSearchFilter('location',null,'is',projectLocation);
	//filters[2] = new nlobjSearchFilter('custentity_job_resource_type',null,'is',1); Was previously used to exclude Equipment, now search can include valid equipment as non-valid equipment has location of NULL
	filters[2] = new nlobjSearchFilter('isjobresource',null,'is',"T");
	filters[3] = new nlobjSearchFilter('custentity_testexternal',null,'is',"F");
	
	alert("5");
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	columns[1] = new nolbjSearchColumn('billingclass');
	columns[2] = new nlobjSearchColumn('laborcost');
	
	alert("6");
	
	var searchResults = nlapiSearchRecord('employee',null,filters,columns);	
	
	alert("7");
	
	//Iterate through LinesOfBusiness - Currently a placeholder until checkboxes exist on Opportunity
	for (var k = 0; k<LineOfBusinessPlaceholder.length; k++) {
		
		alert("8");
		
		//Create Project Task
		var projectTask = nlapiCreateRecord('projecttask');
		nlapiLogExecution('debug','Begun creating project task for project ' + ProjectID);
		
		alert("9");
		
		//Populate Header Fields
		projectTask.setFieldValue('customform',PTForm);
		projectTask.setFieldValue('title',LineOfBusinessPlaceholder[k]);
		projectTask.setFieldValue('company',ProjectID);
		projectTask.setFieldValue('status',PTStatus);
		projectTask.setFieldValue('nonbillabletask',PTBillable);
		projectTask.setFieldValue('constrainttype',PTConstraint);
		projectTask.setFieldValue('message',TestNotes);
		
		alert("10");
		
		//Add Resources by iterating through search results
		for (var i = 0; i<searchResults.length; i++) {
			
			alert("11");
			
			var currentResult = searchResults[i];
			var currentResource = currentResult.getValue('internalid');
			var currentBillingClass = currentResult.getValue('billingclass'); //Added for Validity Check of Resource in v1.30 on 2017/09/21
			var currentLabourCost = currentResult.getValue('laborcost'); //Added for Validity Check of Resource in v1.30 on 2017/09/21
			var tempResourceType = nlapiLookupField('employee',currentResource,'custentity_job_resource_type');
			var tempServiceItem = ResourceServiceItem; //ID of "Regular Time" as default
			
			alert("12");
			
			if (tempResourceType == 4) { tempServiceItem = EquipmentServiceItem; } //If type is equipment, set service item to equipment item instead of resource item
			
			alert('ADDING RESOURCE: '+currentResource+'\nBillingClass: '+currentBillingClass+'<'+currentBillingClass==""+'>\nLabourCost: '+currentLabourCost+'<'+currentLabourCost==""+'>');
			
			//Check if Valid Resource - Added for Validity Check in v1.30 on 2017/09/21
			if(currentLabourCost!="" && currentLabourCost !== null && currentBillingClass != "" && currentBillingClass !== null) {
				
				alert("13");
				
				//Set Line Values for each resource
				projectTask.selectNewLineItem('assignee');
				projectTask.setCurrentLineItemValue('assignee','resource',currentResource);
				projectTask.setCurrentLineItemValue('assignee','serviceitem',tempServiceItem);
				projectTask.setCurrentLineItemValue('assignee','estimatedwork',EstimatedWork);tech
				projectTask.commitLineItem('assignee');
				
				alert("14");
				
			} else {
				
				alert("15");
				
				//Log an error message and send an email regarding the resource that is not valid
				nlapiLogExecution('ERROR','ConvertOppToProj() subfunction CreateProjectTask() has an encountered an error.','Resource '+currentResource+' has an invalid value for BillingClass:'+currentBillingClass+' or LaborCost:'+currentLabourCost);
				
				alert("16");
				
				EmailBody = 'The SuiteScript subfunction "CreateProjectTask()" in function "ConvertToProject()" has failed while attempting to create a project task in the '+NSContext+' environment. The resource '+currentResource+' has an invalid value for BillingClass:<'+currentBillingClass+'> or LaborCost:<'+currentLabourCost+'>. Please review the error logs and identify the source of the error.';
				nlapiSendEmail(EmailAuthor,EmailRecipient,EmailSubject,EmailBody);
				
				alert("17");
			}
			alert("18");
		}
		alert("19");
		//Commit Project Task
		var projectTaskID = nlapiSubmitRecord(projectTask,true,false);
		nlapiLogExecution('debug','submitted project task ',projectTaskID);
		alert("20");
	}
}

