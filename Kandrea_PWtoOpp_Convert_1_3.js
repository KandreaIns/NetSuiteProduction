/* @Client Script called by Button for Potential Work records

This script should create a new Opportunity from a Potential Work record
and return a link to the new record

Version 1.30 - Added an input prompt to force users to select either 'Fixed' or 'Time' as their project billing type on conversion to Opportunity
Version 1.20 - Added logic to select province from field on Opportunity, as previous version caused errors for branch managers who were unable to load location records.
Version 1.10 - Added logic to look up Province from new field on Location, as that was recently made mandatory on Opportunities and Projects and it wont convert without that value.
Version 1.00 - Released
*/

function ConvertToOpportunity() {

//Require confirmation from User
var r = confirm("Are you sure you want to create an Opportunity?");
if (r === true) {
	//Initialize
	var CustomForm = 117;
	var EntityStatus = 12;
	var Department = 4;
	var LineOfBusiness = 2;
	var PWStatus = 2;

	//alert("1");
	//get Internal ID of the Potential Work record
	var PW_InternalID = nlapiGetRecordId();
	nlapiLogExecution('debug','Beginning conversion of PW #',PW_InternalID);

	//alert("2");
	//load the Potential Work record
	var pw = nlapiLoadRecord('customrecord_potential',PW_InternalID);

	//alert("3");
	//Validate that the PW is ready for conversion
	var CheckOppNum = pw.getFieldValue('custrecord_oppnumber');
	//alert("4");
	//alert("CheckOppNum = " + CheckOppNum);
	if(nlapiGetRecordType() == 'customrecord_potential' && CheckOppNum == null)	//ADD CHECK FOR OPPNUMBER HERE
		{
		//alert("Passed CheckOppNum");
		//alert("5");
		var CheckEstimateOwner = pw.getFieldValue('custrecord_estimateowner');
		var CheckDueDate = pw.getFieldValue('custrecord_duedate');
		var CheckProvince = pw.getFieldValue('custrecord_locationprovince2');
		//alert("6");
		if(CheckEstimateOwner == null || CheckDueDate == null) //ADD CHECK FOR ESTIMATE OWNER AND DUE DATE HERE
			{
				//alert("7-A");
			alert("Please enter a value for Estimate Owner and Due Date before converting this record.\nEstimate Owner = " + CheckEstimateOwner + "\nDue Date = " + CheckDueDate);
			} else if(CheckProvince == null) {
			alert("Please select a valid location so that 'Province' is not empty");
			} else {
				var OppBillingType = "";
				var RawType = prompt("Is this a fixed bid or time and material opportunity?\nPlease enter 'fixed' or 'time' to select an option.","");
				var BillingType = RawType.toLowerCase();
				var BillingType1 = BillingType.substring(0,5); //Check if first 5 characters are 'fixed'
				var BillingType2 = BillingType.substring(0,4); //Check if first 4 characters are 'time'
				
				//Set OppBillingType
				if(BillingType1 == 'fixed') {
					OppBillingType = 3;
				} else if (BillingType2 == 'time') {
					OppBillingType = 2;
				} 
				
				//Verify OppBillingType
				if (!(OppBillingType == 2 || OppBillingType == 3)){alert("Billing Type is not valid, please try again."); //Validate OppBillingType
				} else { //Proceed with Opportunity Conversion
				
				
				//alert("7-B");
				//Get required Body Values from PW
				var Customer = pw.getFieldValue('custrecord_potentialcompany');
				var DueDate = pw.getFieldValue('custrecord_duedate');
				var EstimateOwner = pw.getFieldValue('custrecord_estimateowner');
				var SalesRep = pw.getFieldValue('owner');
				var ProjectName = pw.getFieldValue('altname');
				var BranchLocation = nlapiLookupField('employee',SalesRep,'location');
				//alert("8");
				if (BranchLocation === '') {BranchLocation = 5;} //Error handling for missing Sales Rep Location
				var Province = pw.getFieldValue('custrecord_locationprovince2');
				//Get Optional Body Values from PW
				
				//alert("9");
				//Create New Record
				var opp = nlapiCreateRecord('opportunity');
				nlapiLogExecution('debug','Begun Opp Creation for PW',PW_InternalID);
				
				//alert("10");
				//Copy Required Body Values to Opportunity
				opp.setFieldValue('customform',CustomForm);
				//opp.setFieldValue('entitystatus',12);
				opp.setFieldValue('expectedclosedate',DueDate);
				opp.setFieldValue('custbody_estimateowner',EstimateOwner);
				opp.setFieldValue('salesrep',SalesRep);
				opp.setFieldValue('entity',Customer);
				opp.setFieldValue('title',ProjectName);
				opp.setFieldValue('department',Department);
				opp.setFieldValue('class',LineOfBusiness);
				opp.setFieldValue('location',BranchLocation);
				opp.setFieldValue('custbody_canadaprovince',Province);
				opp.setFieldValue('custbody_projectbillingtype',OppBillingType);
				//alert("Copied Values, ready to submit record");
						
				//Copy Optional Body Values to Opportunity
				//opp.setFieldValue('custbody_submissiontime',SubmissionTime);	Only testing required fields to start
				//opp.setFieldValue('leadsource',LeadSource);					Not Currently in Use
				
				//alert("11");
				//Commit to NetSuite
				var oppID = nlapiSubmitRecord(opp,true,false);
				//alert("12");
				var oppNum =nlapiLookupField('opportunity',oppID,'tranid');
				//alert("Submitted Record!");
				//alert("13");
				nlapiLogExecution('AUDIT', 'opportunity record created successfully', 'ID = ' + oppID);
				//alert("Logged audit of record creation");
				
				//alert("14");
				//Return Opportunity Number, Hyperlink to Potential Work and change status to Converted to Opportunity
				nlapiSubmitField('customrecord_potential',PW_InternalID,'custrecord_oppnumber',oppNum);
				nlapiSubmitField('customrecord_potential',PW_InternalID,'custrecord_opplink',"https://system.na1.netsuite.com/app/accounting/transactions/opprtnty.nl?id=" + oppID);
				nlapiSubmitField('customrecord_potential',PW_InternalID,'custrecord_potentialstatus',PWStatus);
				//nlapiSubmitField('customrecord_potential',PW_InternalID,'custrecord_potentialdateclosed',CurrentDate); //Future Enhancement - Need method to return current date
				alert("Opportunity has been created! ID# " + oppNum);
				}
			}
		} else { alert("Opportunity " + CheckOppNum + " has already been created for this record."); }
	} else { alert("You have cancelled Opportunity Conversion"); }
}