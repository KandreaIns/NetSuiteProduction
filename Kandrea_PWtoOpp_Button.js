/* @User Event Script on Before Record Load for Potential Work records

This script should add a button called 'Convert to Opportunity' to the Potential Work records
Make sure that the button only shows on View so that field values have been saved prior to conversion
*/

function BeforeLoadPotential(type, form) {
	nlapiLogExecution('audit','Convert to Opp beginning on Potential Work #',nlapiGetRecordId());
	try {		
		form.setScript('customscript_kandrea_pwtoopp_convert');
		form.addButton('custpage_custombutton','Convert to Opportunity','ConvertToOpportunity()');
		nlapiLogExecution('debug','Convert to Opp script has been triggered','');
		}
	catch (err) {
		nlapiLogExecution('error','BeforeLoadPotential', err);
		}
}