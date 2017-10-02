function DisableProjectClosingDate(type) {
	
	var UserRole = nlapiGetRole();
	
	if (UserRole == '1008' || UserRole == '1009' || UserRole == '1006' || UserRole == '3') { //User is AR Admin, Controller, Administrator
		//Make sure Project Closing Date is not disabled
		nlapiSetFieldDisabled('enddate',false);
	} else {
		//Disable Project Closing Date
		nlapiSetFieldDisabled('enddate',true)
	}
}