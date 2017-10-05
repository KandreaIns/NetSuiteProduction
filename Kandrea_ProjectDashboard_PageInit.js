/**
Client PageInit Script on Project Record to set default values for Project Dashboard calculated fields

**/

//Global Variables
//13 arrays are created to store values for fields. Format is FieldName[Cost,Revenue,Net]
var arrayNIM = [0.0,0.0,0.0];
var arrayNIL = [0.0,0.0,0.0];
var arrayNIE = [0.0,0.0,0.0];
var arrayNIF = [0.0,0.0,0.0];
var arrayNIT = [0.0,0.0,0.0];
var arrayIM = [0.0,0.0,0.0];
var arrayIL = [0.0,0.0,0.0];
var arrayIE = [0.0,0.0,0.0];
var arrayIF = [0.0,0.0,0.0];
var arrayIT = [0.0,0.0,0.0];
var arrayNI = [0.0,0.0,0.0];
var arrayI = [0.0,0.0,0.0];
var arrayTotal = [0.0,0.0,0.0];

function OnProjectPageInit() {
	//Get Record Values
	projectID = nlapiGetFieldValue('internalid');
	
	//Run 3 searches
	
	//Iterate through 3 searches
	
	//Debugging Output: Values of arrays after searches processed
	alert("arrayNIM: " + arrayNIM + "\narrayNIL: " + arrayNIL + "\narrayNIE: " + arrayNIE + "\narrayNIF: " + arrayNIF + "\narrayNIT: " + arrayNIT + 
			"\narrayIM: " + arrayIM + "\narrayIL: " + arrayIL + "\narrayIE: " + arrayIE + "\narrayIF: " + arrayIF + "\narrayIT: " + arrayIT + 
			"\n\narrayNI: " + arrayNI + "\narrayI: " + arrayI + "\narrayTotal: " + arrayTotal);
	
	//Set default values for project
	nlapiSetFieldValue('custentity18',arrayIM[0]); //Invoiced Material Cost
	nlapiSetFieldValue('custentity19',arrayIM[1]); //Invoiced Material Revenue
	nlapiSetFieldValue('custentity20',arrayIM[2]); //Invoiced Material Net
	
	nlapiSetFieldValue('custentity16',arrayIL[0]); //Invoiced Labour Cost
	nlapiSetFieldValue('custentity16',arrayIL[1]); //Invoiced Labour Revenue
	nlapiSetFieldValue('custentity25',arrayIL[2]); //Invoiced Labour Net
	
	nlapiSetFieldValue('custentity21',arrayIE[0]); //Invoiced Equipment Cost
	nlapiSetFieldValue('custentity22',arrayIE[1]); //Invoiced Equipment Revenue
	nlapiSetFieldValue('custentity23',arrayIE[2]); //Invoiced Equipment Net
	
	nlapiSetFieldValue('custentity26',arrayIT[0]); //Invoiced ThirdParty Cost
	nlapiSetFieldValue('custentity27',arrayIT[1]); //Invoiced ThirdParty Revenue
	nlapiSetFieldValue('custentity28',arrayIT[2]); //Invoiced ThirdParty Net
	
	nlapiSetFieldValue('custentity29',arrayIF[0]); //Invoiced Freight Cost
	nlapiSetFieldValue('custentity30',arrayIF[1]); //Invoiced Freight Revenue
	nlapiSetFieldValue('custentity31',arrayIF[2]); //Invoiced Freight Net
	
	
	nlapiSetFieldValue('custentity32',arrayNIM[0]); //NotInvoiced Material Cost
	nlapiSetFieldValue('custentity33',arrayNIM[1]); //NotInvoiced Material Revenue
	nlapiSetFieldValue('custentity34',arrayNIM[2]); //NotInvoiced Material Net
	
	nlapiSetFieldValue('custentity38',arrayNIL[0]); //NotInvoiced Labour Cost
	nlapiSetFieldValue('custentity39',arrayNIL[1]); //NotInvoiced Labour Revenue
	nlapiSetFieldValue('custentity40',arrayNIL[2]); //NotInvoiced Labour Net
	
	nlapiSetFieldValue('custentity35',arrayNIE[0]); //NotInvoiced Equipment Cost
	nlapiSetFieldValue('custentity36',arrayNIE[1]); //NotInvoiced Equipment Revenue
	nlapiSetFieldValue('custentity37',arrayNIE[2]); //NotInvoiced Equipment Net
	
	nlapiSetFieldValue('custentity41',arrayNIT[0]); //NotInvoiced ThirdParty Cost
	nlapiSetFieldValue('custentity42',arrayNIT[1]); //NotInvoiced ThirdParty Revenue
	nlapiSetFieldValue('custentity43',arrayNIT[2]); //NotInvoiced ThirdParty Net
	
	nlapiSetFieldValue('custentity44',arrayNIF[0]); //NotInvoiced Freight Cost
	nlapiSetFieldValue('custentity45',arrayNIF[1]); //NotInvoiced Freight Revenue
	nlapiSetFieldValue('custentity46',arrayNIF[2]); //NotInvoiced Freight Net
	
	
	nlapiSetFieldValue('custentity53',arrayNI[0]); //NotInvoiced Total Cost
	nlapiSetFieldValue('custentity52',arrayNI[1]); //NotInvoiced Total Revenue
	nlapiSetFieldValue('custentity54',arrayNI[2]); //NotInvoiced Total Net
	nlapiSetFieldValue('custentity55',arrayI[0]); //Invoiced Total Cost
	nlapiSetFieldValue('custentity56',arrayI[1]); //Invoiced Total Revenue
	nlapiSetFieldValue('custentity57',arrayI[2]); //Invoiced Total Net
	
	nlapiSetFieldValue('custentity59',arrayNI[0]); //Summary NotInvoiced Cost
	nlapiSetFieldValue('custentity58',arrayNI[1]); //Summary NotInvoiced Revenue
	nlapiSetFieldValue('custentity60',arrayNI[2]); //Summary NotInvoiced Net
	nlapiSetFieldValue('custentity61',arrayI[0]); //Summary Invoiced Cost
	nlapiSetFieldValue('custentity62',arrayI[1]); //Summary Invoiced Revenue
	nlapiSetFieldValue('custentity63',arrayI[2]); //Summary Invoiced Net
	nlapiSetFieldValue('custentity65',arrayTotal[0]); //Summary Total Cost
	nlapiSetFieldValue('custentity64',arrayTotal[1]); //Summary Total Revenue
	nlapiSetFieldValue('custentity66',arrayTotal[2]); //Summary Total Net
	
}