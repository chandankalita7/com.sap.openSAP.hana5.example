jQuery.sap.require("sap.m.MessageBox");
jQuery.sap.require("sap.ui.core.format.DateFormat");
jQuery.sap.require("sap.hana.democontent.epm.job.util.utility");
jQuery.sap.require("sap.hana.democontent.epm.job.app.tileDialog");

sap.ui.controller("sap.hana.democontent.epm.job.view.app", {

	handlePressHome: function(oEvent) {
		sap.m.URLHelper.redirect("../launchpad/index.html", false);
	},

	onInit: function() {
		this.loadJobsTable();
		this.setDateTimeValue();
	},

	loadJobsTable: function() {
		$.ajax({
			type: "GET",
			url: "/schedules/getjobschedules",
			async: true,
			dataType:'json',
			success: function(data, textStatus, request) {
				var oTable = sap.ui.getCore().byId("__xmlview0--manageJobsTable");
				var oModelTable = new sap.ui.model.json.JSONModel();
				oModelTable.setData({
					modelData: data
				});
				oTable.setModel(oModelTable);
				oTable.bindRows("/modelData");
			},
			error: function(jqXHR, textStatus, errorThrown) {
				sap.ui.commons.MessageBox.show("Error in loading Jobs Table",
					"ERROR",
					"Error");
				return;
			}
		});
	},
	
	setDateTimeValue: function(){
			sap.ui.getCore().byId("__xmlview0--startDateField").setDateValue(new Date());
			var tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate()+1);
			sap.ui.getCore().byId("__xmlview0--endDateField").setDateValue(tomorrow);
			sap.ui.getCore().byId("__xmlview0--startTimeField").setDateValue(new Date());
			sap.ui.getCore().byId("__xmlview0--endTimeField").setDateValue(new Date());
	},
	
	checkValue: function(oEvent){
		if(oEvent.getSource().getValue() === ""){
			oEvent.getSource().setDateValue(new Date());
		}
	},

	onButtonPress: function(oEvent, oController) {
		//on New Button Press
		// var i18n = this.getView.getModel("i18n");
		var oBundle = jQuery.sap.resources({
			url: "./i18n/messagebundle.hdbtextbundle",
			locale: "EN"
		});
		var oThis = this;
		if (oEvent.getSource() === this.byId("btnNew")) {
			var doSubmit = this.validateFields(oEvent, oController);
			if (doSubmit === false) {
				return;
			}
			var uiKeyMapper = oBundle.getText("uiKeyMapper");
			var uiFieldArrayMapper = uiKeyMapper.split(",");

			var item = {};
			for (var i = 0; i < uiFieldArrayMapper.length; i++) {
				var id = (uiFieldArrayMapper[i].split(":"))[0];
				var uiId = (uiFieldArrayMapper[i].split(":"))[1];
				var element = sap.ui.getCore().byId(uiId);
				var value = element.getValue();
				if ((uiId.includes("Time") || uiId.includes("Date")) !== false) {
					var uiIdTime = uiId.replace("Date","Time");
					var elementValue = sap.ui.getCore().byId(uiIdTime).getValue();
					var offset = new Date().getTimezoneOffset();
					
					// offset = ((offset<0? '+':'-')+ // Note the reversed sign!
        				offset = new Date().toString().match(/([-\+][0-9]+)\s/)[1];
					value = value+" "+elementValue+" "+offset;
				}
				item[id] = value;
			}
            item.password= window.btoa(item.password);
             item.appurl = "https://"+window.location.hostname+":"+window.location.port+"/jobactivity/create";
			var xsrf_token;
			$.ajax({
				type: "GET",
				async: false,
				url: "/schedules/createjobschedule",
				contentType: "application/json",
				headers: {
					'x-csrf-token': 'Fetch'
				},
				success: function(data, textStatus, request) {
					xsrf_token = request.getResponseHeader('x-csrf-token');
				},
				error: function(jqXHR, textStatus, errorThrown) {
					sap.ui.commons.MessageBox.show("Error in fetching XSRF token",
						"ERROR",
						"Error");
					return;
				}
			});

			$.ajax({
				type: "POST",
				url: "/schedules/createjobschedule",
				headers: {
					'x-csrf-token': xsrf_token
				},
				contentType: "application/json",
				data: JSON.stringify(item),
				dataType: "json",
				success: function(data, oController) {
					// var obj = JSON.parse(data);
					var oJobName = data.JobName;
					sap.ui.commons.MessageBox.show('Job ' + oJobName + ' Created Successfully',
						"SUCCESS",
						"Job is created and scheduled successfully");
						oThis.loadJobsTable();
						oThis.clearUIFields();
				},
				error: function(jqXHR, textStatus, errorThrown) {
					sap.ui.commons.MessageBox.show("Creation of Job failed. Please ensure that the job name is unique!",
						"ERROR",
						"Error");
					return;
				}
			});
			return;
		} else if (oEvent.getSource() === this.byId("btnDeleteLogs")) {
			var xsrf_token;
			$.ajax({
				type: "GET",
				async: false,
				url: "/jobs/deletedata",
				contentType: "application/json",
				headers: {
					'x-csrf-token': 'Fetch'
				},
				success: function(data, textStatus, request) {
					xsrf_token = request.getResponseHeader('x-csrf-token');
				},
				error: function(jqXHR, textStatus, errorThrown) {
					sap.ui.commons.MessageBox.show("Error in fetching XSRF token",
						"ERROR",
						"Error");
					return;
				}
			});
			$.ajax({
				type: "DELETE",
				url: "/jobs/deletedata",
				headers: {
					'x-csrf-token': xsrf_token
				},
				success: function(data, textStatus, request) {
					sap.ui.commons.MessageBox.show("Job activity logs have been deleted successfully",
					"SUCCESS",
					"Job Deletion");
					oThis.loadJobActivitiesTable();
				},
				error: function(jqXHR, textStatus, errorThrown) {
					sap.ui.commons.MessageBox.show("Deletion of Job Activity Logs Failed",
						"ERROR",
						"Error");
					return;
				}
			});
		} else if (oEvent.getSource() === this.byId("btnRefreshJobActivity")) {
			this.loadJobActivitiesTable();
		} else if (oEvent.getSource() === this.byId("btnDeleteJob")) {
			this.deleteJob();
			this.loadJobsTable();
		}
	},

	validateFields: function(oEvent, oController) {
		// var i18n = this.getView.getModel("i18n");
		var oBundle = jQuery.sap.resources({
			url: "./i18n/messagebundle.hdbtextbundle",
			locale: "EN"
		});
		var doSubmit = true;
		var uiFieldsArray = oBundle.getText("uiKeyMapper");
		var uiFields = uiFieldsArray.split(",");
		for (var i = 0; i < uiFields.length; i++) {
			var uiId = (uiFields[i].split(":"))[1];
			var element = sap.ui.getCore().byId(uiId);
			if (element.getValue() === "") {
					element.setValueState(sap.ui.core.ValueState.Error);
					doSubmit = false;
			} else {
				element.setValueState(sap.ui.core.ValueState.None);
			}
		}
		if(doSubmit === true){
			var startDate = sap.ui.getCore().byId("__xmlview0--endDateField").getDateValue();
			var endDate = sap.ui.getCore().byId("__xmlview0--startDateField").getDateValue();
			if(endDate >= startDate){
				sap.ui.commons.MessageBox.show("Enter a valid value for start date and end date",
						"ERROR",
						"Error");
				doSubmit = false;
			}
		}
		return doSubmit;
	},

	clearUIFields: function() {
		// var i18n = this.getView.getModel("i18n");
		var oBundle = jQuery.sap.resources({
			url: "./i18n/messagebundle.hdbtextbundle",
			locale: "EN"
		});
		var uiFieldsArray = oBundle.getText("uiKeyMapper");
		var uiFields = uiFieldsArray.split(",");
		for (var i = 0; i < uiFields.length; i++) {
			var uiId = (uiFields[i].split(":"))[1];
			var element = sap.ui.getCore().byId(uiId);
			if (element.getValue() !== "") {
				element.setValue("");
			}
			element.setValueState(sap.ui.core.ValueState.none);
		}
		this.setDateTimeValue();
		sap.ui.getCore().byId("__xmlview0--xsCronInput").setValue("* * * * * * */40");
	},
	
	onTabPress: function(oEvent){
		if (oEvent.getParameter("key") === "manage"){
			// this.loadJobsTable();
		}
		if (oEvent.getParameter("key") === "jobAction"){
			this.loadJobActivitiesTable();
		}
	},

	loadJobActivitiesTable: function() {
		$.ajax({
			type: "GET",
			url: "/jobs/getalljobs",
			async: true,
			dataType: 'json',
			success: function(data, textStatus, request) {
				var oTable = sap.ui.getCore().byId("__xmlview0--jobActionsTable");
				var oModelTable = new sap.ui.model.json.JSONModel();
				oModelTable.setData({
					modelData: data
				});
				oTable.setModel(oModelTable);
				oTable.bindRows("/modelData");
			},
			error: function(jqXHR, textStatus, errorThrown) {
				sap.ui.commons.MessageBox.show("Error in fetching XSRF Token",
					"ERROR",
					"Error");
				return;
			}
		});
	},

	deleteJob: function() {
		var oTable = sap.ui.getCore().byId("__xmlview0--manageJobsTable");
		var model = oTable.getModel();
		var jobId = model.getProperty("JobId", oTable.getContextByIndex(oTable.getSelectedIndex()));
		var oThis = this; 
		var xsrf_token;
		$.ajax({
			type: "GET",
			async: false,
			url: "/schedules/createjobschedule",
			contentType: "application/json",
			headers: {
				'x-csrf-token': 'Fetch'
			},
			success: function(data, textStatus, request) {
				xsrf_token = request.getResponseHeader('x-csrf-token');
			},
			error: function(jqXHR, textStatus, errorThrown) {
				sap.ui.commons.MessageBox.show("Error in fetching XSRF Token",
					"ERROR",
					"Error");
				return;
			}
		});

		$.ajax({
			type: "DELETE",
			url: "/schedules/deletejobschedules/" + jobId,
			headers: {
				'x-csrf-token': xsrf_token
			},
			success: function(data) {
				sap.ui.commons.MessageBox.show(data.message,
					"SUCCESS",
					"Job deleted successfully");
				oThis.loadJobsTable();
			},
			error: function(jqXHR, textStatus, errorThrown) {
				sap.ui.commons.MessageBox.show("Deletion of Job failed",
					"ERROR",
					"Error");
				return;
			}
		});
	}

});