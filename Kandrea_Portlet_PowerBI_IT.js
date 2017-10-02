/**
Portlet Script for IT Dashboard

**/

function PowerBI_IT(request,response) {
	portlet.setTitle('IT WFM');
	var content = '<iframe width="933" height="700" src="https://app.powerbi.com/view?r=eyJrIjoiMjhmMzg1ZDktM2ZiOC00OGVjLTlmZGItOWYzZTkzMzdiYzEwIiwidCI6IjlhN2M3MzlkLTQwZjMtNGRlOC04YjllLWViNDIzNDRhNGIxNCJ9" frameborder="0" allowFullScreen="true"></iframe>';
	
	content = '<td><span>' + content + '</span></td>';
	portlet.setHtml(content);
}