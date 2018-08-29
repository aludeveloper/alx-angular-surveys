angular.module('mwFormViewer', 
					['ngSanitize', 
					'ui.bootstrap',
					'ng-sortable', 
					'pascalprecht.translate',
					'ngCookies'
					]);



angular.module('mwFormViewer')
    .directive('mwPriorityList', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormQuestion',
        scope: {
            question: '=',
            questionResponse: '=',
            readOnly: '=?',
            options: '=?'
        },
        templateUrl: 'mw-priority-list.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: function(){
            var ctrl = this;

            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            this.$onInit = function() {
                if(!ctrl.questionResponse.priorityList){
                    ctrl.questionResponse.priorityList=[];
                }
                ctrl.idToItem = {};


                sortByPriority(ctrl.questionResponse.priorityList);

                ctrl.availableItems=[];
                ctrl.question.priorityList.forEach(function(item){
                    ctrl.idToItem[item.id] = item;
                    var ordered = ctrl.questionResponse.priorityList.some(function(ordered){
                        return item.id == ordered.id;
                    });
                    if(!ordered){
                        ctrl.availableItems.push({
                            priority: null,
                            id: item.id
                        });
                    }
                });

                ctrl.allItemsOrdered=ctrl.availableItems.length==0 ? true : null;

                var baseConfig = {
                    disabled: ctrl.readOnly,
                    ghostClass: "beingDragged"
//                tolerance: 'pointer',
//                items: 'div',
//                revert: 100

                };

                ctrl.orderedConfig = angular.extend({}, baseConfig, {
                    group:{
                        name: 'A',
                        pull: false,
                        put: ['B']
                    },
                    onEnd: function(e, ui) {
                        updatePriority(ctrl.questionResponse.priorityList);
                    }
                });

                ctrl.availableConfig = angular.extend({}, baseConfig, {
                    sort:false,
                    group:{
                        name: 'B',
                        pull: ['A'],
                        put: false
                    },
                    onEnd: function(e, ui) {
                        updatePriority(ctrl.questionResponse.priorityList);
                        ctrl.allItemsOrdered=ctrl.availableItems.length==0 ? true : null;
                    }
                });
            };

            function updatePriority(array) {
                if(array){
                    for(var i=0; i<array.length; i++){
                        var item = array[i];
                        item.priority = i+1;
                    }
                }

            }

            function sortByPriority(array) {
                array.sort(function (a, b) {
                    return a.priority - b.priority;
                });
            }

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                this.$onInit();
            }

        },
        link: function (scope, ele, attrs, mwFormQuestion){
            var ctrl = scope.ctrl;
            ctrl.print =  mwFormQuestion.print;
        }
    };
});

angular.module('mwFormViewer').directive('mwFormViewer', ["$rootScope", function($rootScope) {

	return {
		replace: true,
		restrict: 'AE',
		scope: {
			formData: '=',
			responseData: '=',
			currentPageIndex: '=?',
			templateData: '=?',
			readOnly: '=?',
			options: '=?',
			formStatus: '=?', //wrapper for internal angular form object
			onSubmit: '&',
			onSave: '&',
			onBack: '&',
			api: '=?'

		},
		templateUrl: 'mw-form-viewer.html',
		controllerAs: 'ctrl',
		bindToController: true,
		controller: ["$timeout", "$interpolate", "$cookies", "$sce", "$filter", "$window", function($timeout, $interpolate, $cookies, $sce, $filter, $window) {
			var ctrl = this;
			var rootScope = $rootScope;
			ctrl.largeFileFlag = false;
			ctrl.invalidPhone = false;
			ctrl.currentPageNumber;
			ctrl.hideSaveButton = localStorage.getItem('hideSaveButton');
			if (ctrl.hideSaveButton == undefined || ctrl.hideSaveButton == '') {
				ctrl.hideSaveButton = false;
			}

			$rootScope.$on("fileRequiredFlag", function(event, flag) {
				ctrl.largeFileFlag = flag;
			});

			$rootScope.$on("hideSaveButton", function(event, flag) {
				ctrl.hideSaveButton = flag.hideSaveButton;
			});

			$rootScope.$on("invalidPhoneFlag", function(event, flag) {
				ctrl.invalidPhone = flag;
			});

			//watch for required and unrequired linked questions
			$rootScope.$on("changeAllData", function(event, data) {
				$timeout(function() {
					console.log("required data", data.requiredQuestionList);
					console.log("unrequired data", data.unrequiredQuestionList);

					angular.forEach(data.requiredQuestionList,function(obj,key){
						angular.forEach(ctrl.currentPage.elements,function(item,index) {
							if (item.question && item.question.id == obj) {
								item.question.required = true;
							}
						});
					});
					angular.forEach(data.unrequiredQuestionList,function(obj1,key1){
						angular.forEach(ctrl.currentPage.elements,function(item1,index1) {
							if (item1.question && item1.question.id == obj1) {
								var quesType = item1.question.type;
								angular.forEach(ctrl.responseData, function(object,id) {
									if (id && id == obj1) {
										if (id && quesType == "checkbox") {
											object.selectedAnswers = [];
										}
										else {
											ctrl.responseData[id] = {};
										}
									}
								})
								item1.question.required = false;
							}
						});
					});
				}, 4000);
				
			});

      		//getting current stage index form alx-apply-frontend
      		ctrl.stageNo = localStorage.getItem('stageIndexNo');

      		ctrl.singleElRow = [];
			// Put initialization logic inside `$onInit()`
			// to make sure bindings have been initialized.
			ctrl.$onInit = function() {
				// ctrl.currentPage.elements.pra.selecteditem.value

				ctrl.condtionalParaFlag = true;
				ctrl.defaultOptions = {
					nestedForm: false,
					autoStart: false,
					disableSubmit: false
				};
				ctrl.options = angular.extend({}, ctrl.defaultOptions, ctrl.options);

				ctrl.submitStatus = 'NOT_SUBMITTED';
				ctrl.formSubmitted = false;

				sortPagesByNumber();
				ctrl.pageIdToPage = {};
				ctrl.formData.pages.forEach(function(page) {
					ctrl.pageIdToPage[page.id] = page;
				});


				ctrl.buttons = {
					prevPage: {
						visible: false,
						disabled: false
					},
					nextPage: {
						visible: false,
						disabled: false
					},
					submitForm: {
						visible: false,
						disabled: false
					}
				};
				rootScope.submitButton = ctrl.buttons.submitForm.visible;
				rootScope.formValid = ctrl.form;
				ctrl.resetPages();

				if (ctrl.api) {
					ctrl.api.reset = function() {
						for (var prop in ctrl.responseData) {
							if (ctrl.responseData.hasOwnProperty(prop)) {
								delete ctrl.responseData[prop];
							}
						}

						ctrl.buttons.submitForm.visible = false;
						rootScope.submitButton = ctrl.buttons.submitForm.visible;
						rootScope.formValid = ctrl.form;
						ctrl.buttons.prevPage.visible = false;
						ctrl.buttons.nextPage.visible = false;
						ctrl.currentPage = null;
						$timeout(ctrl.resetPages, 0);
					};
				}
			};

			ctrl.sfKeyValue = "";
			
			//returning paragraph as html			
			ctrl.getParseParaHtml = function(paragrphData) {
				var paragraphSFKey = paragrphData.SFKey;
				if (paragraphSFKey) {
					var auth_token = localStorage.getItem('auth_token');
					var baseURL = __env.apiUrl
					var userInfo = JSON.parse($cookies.get("userInfo"));
					
					var applicationData = userInfo.applicationIdMap;
					var sfAppId;
					var appName = localStorage.getItem('applicationName');
					angular.forEach(applicationData, function(value, key) {
						appName = key;
						sfAppId = value;
					});

					$.ajax({
						async: false,
						headers: {
							'X-AUTH-TOKEN': auth_token,
							'content-Type': 'Application/Json'
						},
						url: baseURL + "salesforce/paragraph/" + paragraphSFKey + "/" + appName + "/" + userInfo.email,	
						success: function(result) {
							ctrl.sfKeyValue = result;
						}
					});
					return $sce.trustAsHtml(ctrl.sfKeyValue);	
				}
				else {
					return $sce.trustAsHtml(paragrphData.html);
				}
			};
			
			ctrl.getVideoUrl = function() {
				angular.forEach(ctrl.formData.pages, function(obj, key) {
					angular.forEach(obj.elements, function(obj1, key1) {
						if (obj1.type === "videolink") {
							ctrl.videourl = $sce.trustAsHtml(obj1.videolink.html);
						}
					});
				});
			};

			ctrl.getSfFlagValue = function() {
				var conditionalParaSfKey;
				angular.forEach(ctrl.formData.pages, function(obj, key) {
					angular.forEach(obj.elements, function(obj1, key1) {
						if (obj1.selecteditem && obj1.selecteditem.sfkey && obj1.type == "paragraphcondition") {
							conditionalParaSfKey = obj1.selecteditem.sfkey.key;
						}
					});
				});

				var response;
				var auth_token = localStorage.getItem('auth_token');
				var baseURL = __env.apiUrl
				var userInfo = JSON.parse($cookies.get("userInfo"));
				var applicationData = userInfo.applicationIdMap;
				var sfAppId;
				var appName = localStorage.getItem('applicationName');
				angular.forEach(applicationData, function(value, key) {
					appName = key;
					sfAppId = value;
				});

				if (conditionalParaSfKey != "" && conditionalParaSfKey != undefined && appName != "" && appName != undefined) {
					$.ajax({
						async: false,
						headers: {
							'X-AUTH-TOKEN': auth_token,
							'content-Type': 'Application/Json'
						},
						url: baseURL + "/" + "salesforce/conditionalpara/" + conditionalParaSfKey + "/" + appName + "/" + userInfo.email,
						success: function(result) {
							console.log("Geting value", result);
							response = result;
						}
					});
				}

				ctrl.sfFlag = response;
				if (ctrl.sfFlag == "Pass") {
					ctrl.condtionalParaFlag = true;
				} else{
					ctrl.condtionalParaFlag = false;
				}
			};

			ctrl.submitForm = function() {
				if (!ctrl.form.$valid) {
					var el = angular.element("[name='" + ctrl.form.$name + "']");
					el.find('.ng-invalid:visible:first').focus();
					el.find('.ng-invalid:visible:first').blur();
					return false;
				}
				ctrl.formSubmitted = true;
				ctrl.submitStatus = 'IN_PROGRESS';

				ctrl.setCurrentPage(null);


				var resultPromise = ctrl.onSubmit();

				if (resultPromise) {
					resultPromise.then(function() {
						ctrl.submitStatus = 'SUCCESS';
					}).catch(function() {
						ctrl.submitStatus = 'ERROR';
					});
				}
			};

			ctrl.setCurrentPage = function(page) {
				ctrl.currentPage = page;
				
				/*ctrl.linkedquestionList = [];
				console.log("currentPage",ctrl.currentPage);
				console.log("ctrl.formData.pages",ctrl.formData.pages);

				angular.forEach(ctrl.formData.pages, function(obj, key) {
					angular.forEach(obj.elements, function(obj1, key1) {
						if (obj1.type == "question" && obj1.question.type == "radio") {
							angular.forEach(obj1.question.offeredAnswers, function(offans, key1) {
								ctrl.linkedquestionList.push(offans.linkedquestion);
							});
						}
					});
				});

				angular.forEach(ctrl.formData.pages, function(obj, key) {
					angular.forEach(obj.elements, function(obj1, key1) {
						if (obj1.type == "question" && ctrl.linkedquestionList.includes(obj1.question.id)) {
							obj1['isLinked'] = true;
						}
					});
				});*/

				console.log("ctrl.formData.pages",ctrl.formData.pages);

				for(var i=0; i<ctrl.formData.pages.length; i++){
					ctrl.formData.pages[i].elements=$filter('orderBy')(ctrl.formData.pages[i].elements, 'rowNumber');
				}

				console.log("SORTED ctrl.formData.pages",ctrl.formData.pages);
				// ctrl.currentPage  = $filter('orderBy')(ctrl.currentPage.elements, 'rowNumber');
				// console.log("sorted ctrl.currentPage",ctrl.currentPage);
				 ctrl.totalPageLength = ctrl.formData.pages.length;



				if (!page) {

					ctrl.buttons.submitForm.visible = false;

					$rootScope.submitButton = ctrl.buttons.submitForm.visible;

					$rootScope.formValid = ctrl.form;

					ctrl.buttons.prevPage.visible = false;

					ctrl.buttons.nextPage.visible = false;
					return;
				}

				ctrl.setDefaultNextPage();

				ctrl.initResponsesForCurrentPage();


			};


			ctrl.setDefaultNextPage = function() {
				var index = ctrl.formData.pages.indexOf(ctrl.currentPage);
				ctrl.currentPage.isFirst = index == 0;
				ctrl.currentPage.isLast = index == ctrl.formData.pages.length - 1;

				ctrl.buttons.submitForm.visible = ctrl.currentPage.isLast;
				$rootScope.submitButton = ctrl.buttons.submitForm.visible;
				$rootScope.formValid = ctrl.form;
				ctrl.buttons.prevPage.visible = !ctrl.currentPage.isFirst;

				ctrl.buttons.nextPage.visible = !ctrl.currentPage.isLast;
				if (ctrl.currentPage.isLast) {
					ctrl.nextPage = null;
				} else {
					ctrl.nextPage = ctrl.formData.pages[index + 1];
				}

				if (ctrl.currentPage.pageFlow) {
					var formSubmit = false;
					if (ctrl.currentPage.pageFlow.formSubmit) {
						ctrl.nextPage = null;
						formSubmit = true;
					} else if (ctrl.currentPage.pageFlow.page) {
						ctrl.nextPage = ctrl.pageIdToPage[ctrl.currentPage.pageFlow.page.id];
						ctrl.buttons.nextPage.visible = true;
					} else if (ctrl.currentPage.isLast) {
						ctrl.nextPage = null;
						formSubmit = true;
					}
					ctrl.buttons.submitForm.visible = formSubmit;
					$rootScope.submitButton = ctrl.buttons.submitForm.visible;
					$rootScope.formValid = ctrl.form;
					ctrl.buttons.nextPage.visible = !formSubmit;
				}
				ctrl.currentPageNumber = index+1;
				ctrl.currentPageIndex = index+1;	
			};

			ctrl.initResponsesForCurrentPage = function() {
				ctrl.currentPage.elements.forEach(function(element) {
					var question = element.question;
					if (ctrl.responseData && question && !ctrl.responseData[question.id]) {
						ctrl.responseData[question.id] = {};
					}
				});

				var arr = [];
				angular.forEach(ctrl.currentPage.elements,function(item,index) {	          	 	
					arr.push(item.rowNumber);
				});

				ctrl.elementWidth = [];
				var array_elements = arr.sort();
				var current = null;
				var cnt = 0;

				var counts = {};
				array_elements.forEach(function(x) { counts[x] = (counts[x] || 0)+1; });
				angular.forEach(counts, function(item,index) {
					//console.log("item,index",item,index);
					ctrl.elementWidth.push(100/item);
				});
			};

			ctrl.getWidth = function(rowNumber){
				for(var i=0;i<ctrl.elementWidth.length;i++){
					if($window.innerWidth <= 960){
						return { "width" : "100%" };
					}else	if(i+1 == rowNumber){
						return { "width" : ctrl.elementWidth[i] + "%" };
					}
				}
			};

			ctrl.beginResponse = function() {
				if (ctrl.formData.pages.length > 0) {
					ctrl.setCurrentPage(ctrl.formData.pages[0]);
					$rootScope.$broadcast("mwForm.pageEvents.pageCurrentChanged", {
						currentPage: ctrl.currentPage
					});
				}
			};

			ctrl.resetPages = function() {
				ctrl.prevPages = [];

				ctrl.currentPage = null;
				ctrl.nextPage = null;
				ctrl.formSubmitted = false;
				if (ctrl.options.autoStart) {
					ctrl.beginResponse();
				}

			};


			ctrl.goToPrevPage = function() {
				window.scrollTo(0, 0);
				ctrl.onBack();
				var prevPage = ctrl.prevPages.pop();
				ctrl.setCurrentPage(prevPage);
				ctrl.updateNextPageBasedOnAllAnswers();
				$rootScope.$broadcast("mwForm.pageEvents.pageCurrentChanged", {
					currentPage: ctrl.currentPage
				});
			};

			ctrl.goToNextPage = function() {
				if (!ctrl.form.$valid) {
					var el = angular.element("[name='" + ctrl.form.$name + "']");
					console.log(ctrl.form.$name,el);
					el.find('.ng-invalid:visible:first').focus();
					el.find('.ng-invalid:visible:first').blur();
					return false;
				}
				window.scrollTo(0, 0);
				//TODO Saving each page data on next button
				ctrl.onSave();

				ctrl.prevPages.push(ctrl.currentPage);

				ctrl.updateNextPageBasedOnAllAnswers();

				ctrl.setCurrentPage(ctrl.nextPage);
				$rootScope.$broadcast("mwForm.pageEvents.pageCurrentChanged", {
					currentPage: ctrl.currentPage
				});
			};

			ctrl.updateNextPageBasedOnAllAnswers = function() {
				ctrl.currentPage.elements.forEach(function(element) {
					ctrl.updateNextPageBasedOnPageElementAnswers(element);
				});

				ctrl.buttons.submitForm.visible = !ctrl.nextPage;
				$rootScope.submitButton = ctrl.buttons.submitForm.visible;
				$rootScope.formValid = ctrl.form;
				ctrl.buttons.nextPage.visible = !!ctrl.nextPage;
			};

			ctrl.updateNextPageBasedOnPageElementAnswers = function(element) {
				var question = element.question;
				if (question && question.pageFlowModifier) {
					question.offeredAnswers.forEach(function(answer) {
						if (answer.pageFlow) {
							if (ctrl.responseData[question.id].selectedAnswer == answer.id) {
								if (answer.pageFlow.formSubmit) {
									ctrl.nextPage = null;
								} else if (answer.pageFlow.page) {
									ctrl.nextPage = ctrl.pageIdToPage[answer.pageFlow.page.id];
								}
							}
						}
					});
				}
			};

			ctrl.onResponseChanged = function(pageElement) {
				ctrl.setDefaultNextPage();
				ctrl.updateNextPageBasedOnAllAnswers();
			};

			function sortPagesByNumber() {
				ctrl.formData.pages.sort(function(a, b) {
					return a.number - b.number;
				});
			}

			ctrl.print = function(input) {
				if (input && ctrl.templateData) {
					return $interpolate(input)(ctrl.templateData);
				}
				return input;
			};

			// Prior to v1.5, we need to call `$onInit()` manually.
			// (Bindings will always be pre-assigned in these versions.)
			if (angular.version.major === 1 && angular.version.minor < 5) {
				ctrl.$onInit();
			}

		}],
		link: function(scope, ele, attrs) {
			var ctrl = scope.ctrl;
			if (ctrl.formStatus) {
				ctrl.formStatus.form = ctrl.form;
			}

			scope.$on('mwForm.pageEvents.changePage', function(event, data) {
				if (typeof data.page !== "undefined" && data.page < ctrl.formData.pages.length) {
					ctrl.resetPages();
					for (var i = 0; i < data.page; i++) {
						ctrl.prevPages.push(ctrl.formData.pages[i]);
					}
					var currenPge = ctrl.formData.pages[data.page];
					ctrl.setCurrentPage(currenPge);
					$rootScope.$broadcast("mwForm.pageEvents.pageCurrentChanged", {
						currentPage: currenPge
					});
					ctrl.updateNextPageBasedOnAllAnswers();
				}
			});


		}
	};
}]);
angular.module('mwFormViewer').factory("FormQuestionId", function() {
        var id = 0;
        return {
            next: function() {
                return ++id;
            }
        }
    })
    .config(["$mdDateLocaleProvider", function($mdDateLocaleProvider){
        $mdDateLocaleProvider.formatDate = function (date) {
            return date ? moment(date).format('DD/MM/YYYY') : '';
        };
        $mdDateLocaleProvider.parseDate = function (dateString) {
            var m = moment(dateString, 'DD/MM/YYYY', true);
            return m.isValid() ? m.toDate() : new Date(NaN);
        };
    }]);

    angular.module('mwFormViewer').directive('mwFormQuestion', ['$parse','$rootScope', function($parse, $rootScope) {

        return {
            replace: true,
            restrict: 'AE',
            require: '^mwFormViewer',
            scope: {
                question: '=',
                questionResponse: '=',
                readOnly: '=?',
                options: '=?',
            onResponseChanged: '&?'
            },
            templateUrl: 'mw-form-question.html',
            controllerAs: 'ctrl',
            bindToController: true,
            controller: ["$timeout", "FormQuestionId", function($timeout, FormQuestionId) {
                var ctrl = this;
                if($rootScope.linkedquestionList == undefined){
                    $rootScope.linkedquestionList = [];
                }
                ctrl.largeFileFlag = false;
                ctrl.fileSelectedEvent = false;
                ctrl.invalidPhone = false;
                // Put initialization logic inside `$onInit()`
                // to make sure bindings have been initialized.

                ctrl.functionclick = function() {
                    document.getElementById('inputFile').click();
                }
                
                this.$onInit = function() {
                    ctrl.id = FormQuestionId.next();
                    
                    if(ctrl.questionResponse == undefined){
                        return;
                    }

                    if (ctrl.question.type == 'radio') {    //|| ctrl.question.type == 'select'
                        /*if (!ctrl.questionResponse.selectedAnswer) {
                            ctrl.questionResponse.selectedAnswer = null;
                        }*/
                        if (ctrl.questionResponse.selectedAnswer) {
                            ctrl.selectedAnswerId = ctrl.questionResponse.selectedAnswer.id;
                            angular.forEach(ctrl.question.offeredAnswers, function(obj, key) {
                                if (ctrl.selectedAnswerId == obj.id) {
                                    ctrl.questionResponse.selectedAnswer = angular.toJson(obj);
                                }
                            });
                            ctrl.selectedAnswerChanged();
                        }

                        if (ctrl.questionResponse.other) {
                            ctrl.isOtherAnswer = true;
                        }

                    } else if (ctrl.question.type == 'checkbox') {
                        if (ctrl.questionResponse.selectedAnswers && ctrl.questionResponse.selectedAnswers.length) {
                            ctrl.selectedAnswer = true;
                        } else {
                            ctrl.questionResponse.selectedAnswers = [];
                        }
                        if (ctrl.questionResponse.other) {
                            ctrl.isOtherAnswer = true;
                        }


                    } else if (ctrl.question.type == 'grid') {
                        if (!ctrl.question.grid.cellInputType) {
                            ctrl.question.grid.cellInputType = "radio";
                        }
                        //if(ctrl.questionResponse.selectedAnswers){
                        //
                        //}else{
                        //    ctrl.questionResponse.selectedAnswers={};
                        //}
                    } else if (ctrl.question.type == 'division') {

                        ctrl.computeDivisionSum = function() {
                            ctrl.divisionSum = 0;
                            ctrl.question.divisionList.forEach(function(item) {

                                if (ctrl.questionResponse[item.id] != 0 && !ctrl.questionResponse[item.id]) {
                                    ctrl.questionResponse[item.id] = null;
                                    ctrl.divisionSum += 0;
                                } else {
                                    ctrl.divisionSum += ctrl.questionResponse[item.id];
                                }
                            });
                        };

                        ctrl.computeDivisionSum();


                    } else if (ctrl.question.type == 'date' || ctrl.question.type == 'datetime' || ctrl.question.type == 'time') {
                        if (ctrl.questionResponse.answer) {
                            ctrl.questionResponse.answer = new Date(ctrl.questionResponse.answer)
                        }
                    } else if (ctrl.question.type == 'file') {
                        ctrl.questionResponse.fileName = ctrl.questionResponse.fileName_1;
                        ctrl.questionResponse.answer = ctrl.questionResponse.answer;
                    }

                    ctrl.isAnswerSelected = false;
                    ctrl.initialized = true;
                };
                    
                ctrl.hideRadioLinkedQuestions = function (qdata) {
                    $timeout(function() {
                        if ($rootScope.linkedquestionList.includes(qdata.id)) {
                            document.getElementById(qdata.id).parentElement.parentElement.parentElement.style.display = "none";
                        }

                        if (qdata.type == "radio") { //|| qdata.type == "select"
                            angular.forEach(qdata.offeredAnswers, function(offans, key1) {
                                if (offans.linkedquestion != null && offans.linkedquestion != undefined) {
                                    for(var i=0; i<offans.linkedquestion.length; i++){
                                        if(!$rootScope.linkedquestionList.includes(offans.linkedquestion[i])){
                                            $rootScope.linkedquestionList.push(offans.linkedquestion[i]);
                                        }                                    
                                    }
                                }
                            }); 
                            console.log("Linked question array list",$rootScope.linkedquestionList)
                        }

                    }, 300);
                }

                ctrl.mappingTelephoneQuestion = function(qdata) {
                    $timeout(function() {
                        if(qdata.type == "telephone"){
                            var telInput = $("#phone"),
                              errorMsg = $("#error-msg"),
                              validMsg = $("#valid-msg");

                              console.log(telInput);
                            // initialise plugin
                            telInput.intlTelInput({
                                initialCountry: "auto",
                                geoIpLookup: function(callback) {
                                    $.get('https://ipinfo.io', function() {}, "jsonp").always(function(resp) {
                                      var countryCode = (resp && resp.country) ? resp.country : "";
                                      callback(countryCode);
                                    });
                                },
                                utilsScript: "../bower_components/intl-tel-input/build/js/utils.js"
                            });

                            var reset = function() {
                              telInput.removeClass("error");
                              errorMsg.addClass("hide");
                              validMsg.addClass("hide");
                            };

                            // on blur: validate
                            telInput.blur(function() {
                              reset();
                              if ($.trim(telInput.val())) {
                                if (telInput.intlTelInput("isValidNumber")) {
                                    ctrl.invalidPhone = false;
                                    $rootScope.$broadcast('invalidPhoneFlag', ctrl.invalidPhone);
                                  validMsg.removeClass("hide");
                                } else {
                                    ctrl.invalidPhone = true;
                                    $rootScope.$broadcast('invalidPhoneFlag', ctrl.invalidPhone);
                                  telInput.addClass("error");
                                  errorMsg.removeClass("hide");
                                }
                              }
                            });

                            // on keyup / change flag: reset
                            telInput.on("keyup change", reset);
                        }

                    }, 3000);
                }

                ctrl.initQuestionsView = function(qdata) {

                    ctrl.hideRadioLinkedQuestions(qdata);
                    
                    ctrl.mappingTelephoneQuestion(qdata);
                };

                $timeout(function() {
                    $("#phone").on("countrychange", function(e, countryData) {
                        if(ctrl.questionResponse){
                            ctrl.questionResponse.countryCode = countryData.dialCode;
                        }
                    });
                }, 500);

                ctrl.dateChanged = function(date) {
                    ctrl.questionResponse.answer = moment(date).startOf('day').format('MM/DD/YYYY');                    
                };

                ctrl.selectedAnswerChanged = function() {
                    $timeout(function() {
                        //show default selected and linked question response (string checks)
                        if(typeof ctrl.questionResponse.selectedAnswer === 'string' || ctrl.questionResponse.selectedAnswer instanceof String) {
                            ctrl.selectedQuestionAns = ctrl.questionResponse.selectedAnswer
                            ctrl.selectedQuestionAns = JSON.parse(ctrl.selectedQuestionAns)
                            ctrl.resSelectedAnsLinkedQues = ctrl.selectedQuestionAns.linkedquestion;
                        } else {
                            ctrl.resSelectedAnsLinkedQues = ctrl.questionResponse.selectedAnswer.linkedquestion;
                        }
                        //assigning selectd answer linked question
                        if (ctrl.resSelectedAnsLinkedQues != null && ctrl.resSelectedAnsLinkedQues != undefined) {
                            if(ctrl.selectedLinkQ === undefined) {
                                ctrl.selectedLinkQ = ctrl.resSelectedAnsLinkedQues;
                                console.log("ctrl.selectedLinkQ", ctrl.selectedLinkQ);
                                // getting unrequired question list
                                $rootScope.unrequiredQuestionList = [];
                                angular.forEach(ctrl.question.offeredAnswers, function(obj,key){
                                    angular.forEach(obj.linkedquestion, function(obj1,key1){
                                        $rootScope.unrequiredQuestionList.push(obj1);
                                    
                                    })
                                })
                                for (var i = 0; i < ctrl.selectedLinkQ.length; i++) {
                                    document.getElementById(ctrl.selectedLinkQ[i]).parentElement.parentElement.parentElement.style.display = "block";
                                    // filter unrequiredList
                                    $rootScope.unrequiredQuestionList = $rootScope.unrequiredQuestionList.filter(function(item) {return item !== ctrl.selectedLinkQ[i]});
                                }
                                //passing unrequired and required questionvlist to page element
                                $rootScope.$broadcast('changeAllData', {"requiredQuestionList" : ctrl.selectedLinkQ, "unrequiredQuestionList" : $rootScope.unrequiredQuestionList}); 
                            } else {

                                for (var i = 0; i < ctrl.selectedLinkQ.length; i++) {
                                    document.getElementById(ctrl.selectedLinkQ[i]).parentElement.parentElement.parentElement.style.display = "none";
                                    $rootScope.unrequiredQuestionList = $rootScope.unrequiredQuestionList.filter(function(item) {return item == ctrl.selectedLinkQ[i]});
                                }

                                //selected answer object{} string condition checks
                                if(typeof ctrl.questionResponse.selectedAnswer === 'string' || ctrl.questionResponse.selectedAnswer instanceof String) {
                                    ctrl.selectedQuestionAns = ctrl.questionResponse.selectedAnswer
                                    ctrl.selectedQuestionAns = JSON.parse(ctrl.selectedQuestionAns)
                                    ctrl.resSelectedAnsLinkedQues = ctrl.selectedQuestionAns.linkedquestion;
                                } else {
                                    ctrl.resSelectedAnsLinkedQues = ctrl.questionResponse.selectedAnswer.linkedquestion;
                                }

                                ctrl.selectedLinkQ = ctrl.resSelectedAnsLinkedQues;
                                // getting unrequired question list
                                $rootScope.unrequiredQuestionList = [];
                                angular.forEach(ctrl.question.offeredAnswers, function(obj2,key2){
                                    angular.forEach(obj2.linkedquestion, function(obj3,key3){
                                        $rootScope.unrequiredQuestionList.push(obj3);
                                    
                                    })
                                })

                                for (var i = 0; i < ctrl.selectedLinkQ.length; i++) {
                                    document.getElementById(ctrl.selectedLinkQ[i]).parentElement.parentElement.parentElement.style.display = "block";
                                    // filter unrequiredList
                                    $rootScope.unrequiredQuestionList = $rootScope.unrequiredQuestionList.filter(function(item) {return item !== ctrl.selectedLinkQ[i]});
                                }
                                //passing unrequired and required questionvlist to page element
                                $rootScope.$broadcast('changeAllData', {"requiredQuestionList" : ctrl.selectedLinkQ, "unrequiredQuestionList" : $rootScope.unrequiredQuestionList}); 
                            }
                        }
                    }, 1000);
                    
                    
                    delete ctrl.questionResponse.other;
                    ctrl.isOtherAnswer = false;
                    ctrl.answerChanged();

                };
                
                ctrl.otherAnswerRadioChanged = function() {
                    if (ctrl.isOtherAnswer) {
                        ctrl.questionResponse.selectedAnswer = null;
                    }
                    ctrl.answerChanged();
                };

                ctrl.otherAnswerCheckboxChanged = function() {
                    if (!ctrl.isOtherAnswer) {
                        delete ctrl.questionResponse.other;
                    }
                    ctrl.selectedAnswer = ctrl.questionResponse.selectedAnswers.length || ctrl.isOtherAnswer ? true : null;
                    ctrl.answerChanged();
                };


                ctrl.toggleSelectedAnswer = function(answer) {
                    if (ctrl.questionResponse.selectedAnswers != undefined) {
                        if (ctrl.questionResponse.selectedAnswers.indexOf(answer.id) === -1) {
                            ctrl.questionResponse.selectedAnswers.push(answer.id);
                        } else {
                            ctrl.questionResponse.selectedAnswers.splice(ctrl.questionResponse.selectedAnswers.indexOf(answer.id), 1);
                        }
                        ctrl.selectedAnswer = ctrl.questionResponse.selectedAnswers.length || ctrl.isOtherAnswer ? true : null;       
                    } else {
                        ctrl.questionResponse = {
                            selectedAnswers: []
                        }
                    }
                    ctrl.answerChanged();
                };

                ctrl.answerChanged = function() {
                    if (ctrl.onResponseChanged) {
                        ctrl.onResponseChanged();
                    }
                }

                // Prior to v1.5, we need to call `$onInit()` manually.
                // (Bindings will always be pre-assigned in these versions.)
                if (angular.version.major === 1 && angular.version.minor < 5) {
                    this.$onInit();
                }

            }],
            link: function(scope, ele, attrs, mwFormViewer) {
                var ctrl = scope.ctrl;
                ctrl.print = mwFormViewer.print;

                //file uploads

                ele.bind("change", function(changeEvent) {
                    var fileSize;
                    if(changeEvent.target.files && changeEvent.target.files.length>0){
                        fileSize = changeEvent.target.files[0].size / 1024;
                    }
                    
                    console.log("file size.....................",fileSize);
                    if(fileSize == undefined){

                    }else{
                        if (fileSize <= 5120) {
                            ctrl.largeFileFlag = false;
                            ctrl.fileSelectedEvent = true;
                            $rootScope.$broadcast('fileRequiredFlag', ctrl.largeFileFlag);
                            var reader = new FileReader();
                            var fileName = changeEvent.target.files[0];
                            reader.onload = function(loadEvent) {
                                scope.$apply(function() {
                                    ctrl.questionResponse.answer = loadEvent.target.result;
                                    ctrl.questionResponse.fileName = changeEvent.target.files[0].name;
                                    ctrl.questionResponse.fileName_1 = changeEvent.target.files[0].name;
                                });
                            };                            
                            reader.readAsDataURL(changeEvent.target.files[0]); 
                        } else {
                            scope.$apply(function() {
                                ctrl.largeFileFlag = true; 
                            });
                            $rootScope.$broadcast('fileRequiredFlag', ctrl.largeFileFlag);
                            alert("File size cannot exceed 5 MB");
                        }
                    }
                });
            }
        };
    }]);

angular.module('mwFormViewer')
    .directive('mwFormConfirmationPage', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormViewer',
        scope: {
            submitStatus: '=',
            confirmationMessage: '=',
            readOnly: '=?'
        },
        templateUrl: 'mw-form-confirmation-page.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: function(){
            var ctrl = this;


        },
        link: function (scope, ele, attrs, mwFormViewer){
            var ctrl = scope.ctrl;
            ctrl.print =  mwFormViewer.print;
        }
    };
});
