angular.module('mwFormBuilder').directive('mwQuestionOfferedAnswerListBuilder', function () {

    return {
        replace: true,
        restrict: 'AE',
        require: '^mwFormQuestionBuilder',
        scope: {
            question: '=',
            formObject: '=',
            readOnly: '=?',
            options: '=?',
            disableOtherAnswer: '=?',
            fileReader:'='
        },
        templateUrl: 'mw-question-offered-answer-list-builder.html',
        controllerAs: 'ctrl',
        bindToController: true,
        controller: ["FormQuestionBuilderId", "mwFormUuid", function(FormQuestionBuilderId, mwFormUuid){
            var ctrl = this;


            // Put initialization logic inside `$onInit()`
            // to make sure bindings have been initialized.
            this.$onInit = function() {
                ctrl.config={
                    radio:{},
                    checkbox:{}
                };

                ctrl.isNewAnswer = {};

                sortAnswersByOrderNo();

                ctrl.offeredAnswersSortableConfig = {
                    disabled: ctrl.readOnly,
                    ghostClass: "beingDragged",
                    handle: ".drag-handle",
                    onEnd: function(e, ui) {
                        updateAnswersOrderNo();
                    }
                };

                /*ctrl.elements = [ 
                    {
                        "id" : "cb4cd9df70aaa55cf147740830952fdc",
                        "orderNo" : 1,
                        "type" : "question",
                        "question" : {
                            "id" : "82c87e8d551b9439e21dc9aa1b55c548",
                            "text" : "Test question 1",
                            "type" : "text",
                            "required" : true,
                            "pageFlowModifier" : false,
                            "SFKey" : {
                                "key" : "Address_City__c",
                                "label" : "Address City"
                            }
                        }
                    }, 
                    {
                        "id" : "b3b95ff36de581f7e937c5444f35f7d5",
                        "orderNo" : 2,
                        "type" : "question",
                        "question" : {
                            "id" : "8613c0326d496a221d118af60145284d",
                            "text" : "Test question 2",
                            "type" : "text",
                            "required" : true,
                            "pageFlowModifier" : false,
                            "SFKey" : {
                                "key" : "Last_Name__c",
                                "label" : "Last Name"
                            }
                        }
                    }
                    ];*/
                };


                function updateAnswersOrderNo() {
                    if(ctrl.question.offeredAnswers){
                        for(var i=0; i<ctrl.question.offeredAnswers.length; i++){

                            var offeredAnswer = ctrl.question.offeredAnswers[i];

                            offeredAnswer.orderNo = i+1;
                        }
                    }

                }

                function sortAnswersByOrderNo() {
                    if(ctrl.question.offeredAnswers) {
                        ctrl.question.offeredAnswers.sort(function (a, b) {
                            return a.orderNo - b.orderNo;
                        });
                    }
                }

                ctrl.addNewOfferedAnswer=function(){
                    var defaultPageFlow = ctrl.possiblePageFlow[0];
                    var answer = {
                        id: mwFormUuid.get(),
                        orderNo: ctrl.question.offeredAnswers.length + 1,
                        value: null,
                        pageFlow:defaultPageFlow,
                        linkedquestion: null
                    };
                    ctrl.isNewAnswer[answer.id]=true;
                    ctrl.question.offeredAnswers.push(answer);
                };

                ctrl.removeOfferedAnswer=function(answer){
                    var index = ctrl.question.offeredAnswers.indexOf(answer);
                    if(index!=-1){
                        ctrl.question.offeredAnswers.splice(index,1);
                    }
                };

                ctrl.addCustomAnswer=function(){
                    ctrl.question.otherAnswer=true;
                };
                ctrl.removeCustomAnswer=function(){
                    ctrl.question.otherAnswer=false;
                };

                ctrl.linkquestion = function(questionId){
                    // console.log(formQuestionBuilderCtrl.formObject);
                    /*angular.forEach(ctrl.formData.pages, function(obj, key) {
                        angular.forEach(obj.elements, function(obj1, key1) {
                            console.log("dddd",obj1.type);
                            if (obj1.type == "videolink") {
                                //conditionalParaSfKey = obj1.selecteditem.sfkey.key;
                                console.log("$sce.trustAsHtml",obj1.videolink.html);
                                ctrl.videourl = $sce.trustAsHtml(obj1.videolink.html);
                            }
                        });
                    });*/
                };


                ctrl.processData = function(allText) {
                    console.log("WWWWWWWWWWWWW",allText);
                // split content based on new line
                var allTextLines = allText.split(/\r\n|\n/);
                var headers = allTextLines[0].split(',');
                var lines = [];
                var defaultPageFlow = ctrl.possiblePageFlow[0];
                
                for ( var i = 0; i < allTextLines.length; i++) {
                    var answer ;
                    // split content based on comma
                    var data = allTextLines[i].split(',');
                    if (data.length == headers.length) {
                        for ( var j = 0; j < headers.length; j++) {
                            answer = { 
                                id: mwFormUuid.get(),
                                orderNo: ctrl.question.offeredAnswers.length + 1,
                                value: data[j],
                                pageFlow:defaultPageFlow,
                                linkedquestion: null
                            };
                            ctrl.question.offeredAnswers.push(answer);
                            ctrl.isNewAnswer[answer.id]=true;
                        }
                    }
                }
            };

            ctrl.keyPressedOnInput= function(keyEvent, answer){
                delete ctrl.isNewAnswer[answer.id];
                if (keyEvent.which === 13){
                    keyEvent.preventDefault()
                    ctrl.addNewOfferedAnswer();
                }
            };

            // Prior to v1.5, we need to call `$onInit()` manually.
            // (Bindings will always be pre-assigned in these versions.)
            if (angular.version.major === 1 && angular.version.minor < 5) {
                this.$onInit();
            }
        }],
        link: function (scope, ele, attrs, formQuestionBuilderCtrl){
            var ctrl = scope.ctrl;
            ctrl.possiblePageFlow = formQuestionBuilderCtrl.possiblePageFlow;
            console.log("VVVVVVVVVVVVVVVVVVVVVVVVVVVVV",formQuestionBuilderCtrl.formObject.pages[0].elements);
            
            ctrl.elements = formQuestionBuilderCtrl.formObject.pages[0].elements;
            //file uploads
            ele.bind("change", function(changeEvent) {
                var files = changeEvent.target.files;
                var reader = new FileReader();
                if (files.length > 0) {
                    reader.onload = function(e) {
                        var contents = e.target.result;
                    };
                    reader.readAsText(files[0]);
                    setTimeout(function () {
                        ctrl.processData(reader.result);
                    }, 100);
                }
            });
        }
    };
});
