/** @User Event Script on Before Record Load for Work Package record

This script should add a button called 'Convert to Opportunity' to the Potential Work records
Make sure that the button only shows on View so that field values have been saved prior to conversion
**/

function BeforeLoadPackage(type, form) {
	nlapiLogExecution('audit','Work Package Buttons being added for record #',nlapiGetRecordId());
	try {		
		form.setScript('customscript_kandrea_wfmwp_buttons');
		form.addButton('custpage_custombutton','Release','ButtonRelease()');
		form.addButton('custpage_custombutton','Hold','ButtonHold()');
		form.addButton('custpage_custombutton','Unhold','ButtonUnhold()');
		form.addButton('custpage_custombutton','Cancel Package','ButtonCancel()');
		nlapiLogExecution('debug','Work Package Buttons have been added','');
		}
	catch (err) {
		nlapiLogExecution('error','BeforeLoadPackage', err);
		}
}