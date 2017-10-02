/* Kandrea CreateProjectTask
Client Script called by OppToProjectConvert script to create tasks with resources assigned

This script should create a new Project Task attached to an Opportunity record
and add resources to the project task based on the project location

Still Needs:
(TESTING) Logic for Equipment, currently filtered to exclude all
(DONE) Pass ProjectID from OppToProject script
(DONE) Include trigger in OppToProject script

Version 1.12 - Updated logic to correctly check if employee is equipment when selecting service item (previously logic would set all as equipment type)
Version 1.11 - Updated to correctly mark tasks as billable/non-billable based on project billing type (logic was previously incorrect)
Version 1.10 - Added logic to include valid equipment in search, and to set equipment service item correctly on task setup
Version 1.00 - Released
*/

function CreateProjectTaskAdmin() {
	
	//Grab ProjectID (Only Necessary for Admin Script)
	var ProjectID = nlapiGetFieldValue('ID');
	
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
	
	//Get ProjectID, BillingType, LineOfBusiness Checkbox States
	var project = nlapiLoadRecord('job',ProjectID);
	var projectBillingType = project.getFieldValue('jobbillingtype');
	if(projectBillingType == "TM") {PTBillable = "F";} //If Time and Material Project, overwrite to (false = unselected = billable)
	var projectLocation = project.getFieldValue('custentity_proj_location');
	
	//Create Array of Resources for given location via search
	//insert code from test search here...
	var filters = new Array();
	filters[0] = new nlobjSearchFilter('isinactive',null,'is',"F");
	filters[1] = new nlobjSearchFilter('location',null,'is',projectLocation);
	//filters[2] = new nlobjSearchFilter('custentity_job_resource_type',null,'is',1); Was previously used to exclude Equipment, now search can include valid equipment as non-valid equipment has location of NULL
	filters[2] = new nlobjSearchFilter('isjobresource',null,'is',"T");
	filters[3] = new nlobjSearchFilter('custentity_testexternal',null,'is',"F");
	
	var columns = new Array();
	columns[0] = new nlobjSearchColumn('internalid');
	
	var searchResults = nlapiSearchRecord('employee',null,filters,columns);	
	
	//Iterate through LinesOfBusiness - Currently a placeholder until checkboxes exist on Opportunity
	for (var k = 0; k<LineOfBusinessPlaceholder.length; k++) {
		//Create Project Task
		var projectTask = nlapiCreateRecord('projecttask');
		nlapiLogExecution('debug','Begun creating project task for project ' + ProjectID);
		
		//Populate Header Fields
		projectTask.setFieldValue('customform',PTForm);
		projectTask.setFieldValue('title',LineOfBusinessPlaceholder[k]);
		projectTask.setFieldValue('company',ProjectID);
		projectTask.setFieldValue('status',PTStatus);
		projectTask.setFieldValue('nonbillabletask',PTBillable);
		projectTask.setFieldValue('constrainttype',PTConstraint);
		projectTask.setFieldValue('message',TestNotes);
		
		//Add Resources by iterating through search results
		for (var i = 0; i<searchResults.length; i++) {
			var currentResult = searchResults[i];
			var currentResource = currentResult.getValue('internalid');
			var tempResourceType = nlapiLookupField('employee',currentResource,'custentity_job_resource_type');
			var tempServiceItem = ResourceServiceItem; //ID of "Regular Time" as default
			
			if (tempResourceType == 4) { tempServiceItem = EquipmentServiceItem; } //If type is equipment, set service item to equipment item instead of resource item
			
			//Set Line Values for each resource
			projectTask.selectNewLineItem('assignee');
			projectTask.setCurrentLineItemValue('assignee','resource',currentResource);
			projectTask.setCurrentLineItemValue('assignee','serviceitem',tempServiceItem);
			projectTask.setCurrentLineItemValue('assignee','estimatedwork',EstimatedWork);
			projectTask.commitLineItem('assignee');
		}
		//Commit Project Task
		var projectTaskID = nlapiSubmitRecord(projectTask,true,false);
		alert("Project Task Successfully Created!")
		nlapiLogExecution('debug','submitted project task ',projectTaskID);
	}
}