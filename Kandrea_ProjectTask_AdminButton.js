/* @User Event Script on Before Record Load for Project records

This script should add a button called 'Convert to Project' to the Opportunity records
Make sure that the button only shows on View so that field values have been saved prior to conversion
Button will only show for users of the 'Administrator' role

*/

function BeforeLoadProject(type, form) {
	//nlapiLogExecution('audit','Convert to Project beginning on Opportunity #', nlapiLookupField('opportunity',nlapiGetRecordID(),'tranid'));
	try {
		var projectID = nlapiGetFieldValue('ID');
		form.setScript('customscript_createprojecttaskadmin');
		form.addButton('custpage_custombutton','Create Project Task (Admin)','CreateProjectTaskAdmin()');
		nlapiLogExecution('debug','Create Project Task (Admin) has been initiated!','');
		}
	catch (err) {
		nlapiLogExecution('error','BeforeLoadProject',err);
		}
}