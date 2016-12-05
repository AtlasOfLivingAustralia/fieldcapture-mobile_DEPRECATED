/**
 * Knockout view model for organisation pages.
 * @param props JSON/javascript representation of the organisation.
 * @constructor
 */
OrganisationViewModel = function (props) {
    var self = $.extend(this, new Documents());
    var orgTypesMap = {
    aquarium:'Aquarium',
    archive:'Archive',
    botanicGarden:'Botanic Garden',
    conservation:'Conservation',
    fieldStation:'Field Station',
    government:'Government',
    governmentDepartment:'Government Department',
    herbarium:'Herbarium',
    historicalSociety:'Historical Society',
    horticulturalInstitution:'Horticultural Institution',
    independentExpert:'Independent Expert',
    industry:'Industry',
    laboratory:'Laboratory',
    library:'Library',
    management:'Management',
    museum:'Museum',
    natureEducationCenter:'Nature Education Center',
    nonUniversityCollege:'Non-University College',
    park:'Park',
    repository:'Repository',
    researchInstitute:'Research Institute',
    school:'School',
    scienceCenter:'Science Center',
    society:'Society',
    university:'University',
    voluntaryObserver:'Voluntary Observer',
    zoo:'Zoo'
    };
    
    self.organisationId = props.organisationId;
    self.orgType = ko.observable(props.orgType);
    self.orgTypeDisplayOnly = ko.computed(function() {
        return orgTypesMap[self.orgType()] || "Unspecified";
    });
    self.name = ko.observable(props.name);
    self.acronym = ko.observable(props.acronym);
    self.description = ko.observable(props.description).extend({markdown:true});
    self.url = ko.observable(props.url);
    self.newsAndEvents = ko.observable(props.newsAndEvents).extend({markdown:true});;
    self.collectoryInstitutionId = props.collectoryInstitutionId;
    self.breadcrumbName = ko.computed(function() {
        return self.name()?self.name():'New Organisation';
    });

    self.projects = props.projects;

    self.deleteOrganisation = function() {
        if (window.confirm("Delete this organisation?  Are you sure?")) {
            $.post(fcConfig.organisationDeleteUrl).complete(function() {
                    window.location = fcConfig.organisationListUrl;
                }
            );
        };
    };

    self.editDescription = function() {
        editWithMarkdown('Edit organisation description', self.description);
    };

    self.editOrganisation = function() {
       window.location = fcConfig.organisationEditUrl;
    };

    self.transients = self.transients || {};
    self.transients.orgTypes = [];
    for (var ot in orgTypesMap) {
        if (orgTypesMap.hasOwnProperty(ot))
            self.transients.orgTypes.push({orgType:ot, name:orgTypesMap[ot]});
    }

    self.toJS = function(includeDocuments) {
        var ignore = self.ignore.concat(['breadcrumbName', 'orgTypeDisplayOnly', 'collectoryInstitutionId']);
        var js = ko.mapping.toJS(self, {include:['documents'], ignore:ignore} );
        if (includeDocuments) {
            js.documents = ko.toJS(self.documents);
            js.links = ko.mapping.toJS(self.links());
        }
        return js;
    };

    self.modelAsJSON = function(includeDocuments) {
        var orgJs = self.toJS(includeDocuments);
        return JSON.stringify(orgJs);
    };

    self.save = function() {
        if ($('.validationEngineContainer').validationEngine('validate')) {

            var orgData = self.modelAsJSON(true);
            $.ajax(fcConfig.organisationSaveUrl, {type:'POST', data:orgData, contentType:'application/json'}).done( function(data) {
                if (data.errors) {

                }
                else {
                    var orgId = self.organisationId?self.organisationId:data.organisationId;
                    window.location = fcConfig.organisationViewUrl+'/'+orgId;
                }

            }).fail( function() {

            });
        }
    };

    if (props.documents !== undefined && props.documents.length > 0) {
        $.each(['logo', 'banner', 'mainImage'], function(i, role){
            var document = self.findDocumentByRole(props.documents, role);
            if (document) {
                self.documents.push(document);
            }
        });
    }

    // links
    if (props.links) {
        $.each(props.links, function(i, link) {
            self.addLink(link.role, link.url);
        });
    }

    return self;

};

/**
 * Provides the ability to search a user's organisations and other organisations at the same time.  The results
 * are maintained as separate lists for ease of display (so a users existing organisations can be prioritised).
 * @param organisations the organisations not belonging to the user.
 * @param userOrganisations the organisations that belong to the user.
 * @param (optional) if present, this value should contain the organisationId of an organisation to pre-select.
 */
OrganisationSelectionViewModel = function(organisations, userOrganisations, inititialSelection) {

    var self = this;
    var userOrgList = new SearchableList(userOrganisations, ['name']);
    var otherOrgList = new SearchableList(organisations, ['name']);

    self.term = ko.observable('');
    self.term.subscribe(function() {
        userOrgList.term(self.term());
        otherOrgList.term(self.term());
    });

    self.selection = ko.computed(function() {
        return userOrgList.selection() || otherOrgList.selection();
    });

    self.userOrganisationResults = userOrgList.results;
    self.otherResults = otherOrgList.results;

    self.clearSelection = function() {

        userOrgList.clearSelection();
        otherOrgList.clearSelection();
        self.term('');
    };
    self.isSelected = function(value) {
        return userOrgList.isSelected(value) || otherOrgList.isSelected(value);
    };
    self.select = function(value) {
        self.term(value['name']);

        userOrgList.select(value);
        otherOrgList.select(value);
    };

    self.allViewed = ko.observable(false);

    self.scrolled = function(blah, event) {
        var elem = event.target;
        var scrollPos = elem.scrollTop;
        var maxScroll = elem.scrollHeight - elem.clientHeight;

        if ((maxScroll - scrollPos) < 9) {
            self.allViewed(true);
        }
    };

    self.visibleRows = ko.computed(function() {
        var count = 0;
        if (self.userOrganisationResults().length) {
            count += self.userOrganisationResults().length+1; // +1 for the "user orgs" label.
        }
        if (self.otherResults().length) {
            count += self.otherResults().length;
            if (self.userOrganisationResults().length) {
                count ++; // +1 for the "other orgs" label (it will only show if the my organisations label is also showing.
            }
        }
        return count;
    });

    self.visibleRows.subscribe(function() {
        if (self.visibleRows() <= 4 && !self.selection()) {
            self.allViewed(true);
        }
    });
    self.visibleRows.notifySubscribers();


    self.organisationNotPresent = ko.observable();

    var findByOrganisationId = function(list, organisationId) {
        for (var i=0; i<list.length; i++) {
            if (list[i].organisationId === organisationId) {
                return list[i];
            }
        }
        return null;
    };

    if (inititialSelection) {
        var userOrg = findByOrganisationId(userOrganisations, inititialSelection);
        var orgToSelect = userOrg ? userOrg : findByOrganisationId(organisations, inititialSelection);
        if (orgToSelect) {
            self.select(orgToSelect);
        }
    }

};

var ServerSideOrganisationsViewModel = function() {
    var self = this;
    self.pagination = new PaginationViewModel({}, self);
    self.organisations = ko.observableArray([]);
    self.searchTerm = ko.observable('').extend({throttle:500});
    self.searchTerm.subscribe(function(term) {
       self.refreshPage(0);
    });
    self.refreshPage = function(offset) {
        var url = fcConfig.organisationSearchUrl;
        var params = {offset:offset, max:self.pagination.resultsPerPage()};
        if (self.searchTerm()) {
            params.searchTerm = self.searchTerm();
        }
        else {
            params.sort = "nameSort"; // Sort by name unless there is a search term, in which case we sort by relevence.
        }
        $.get(url, params, function(data) {
            if (data.hits) {
                var orgs = data.hits.hits || [];
                self.organisations($.map(orgs, function(hit) {
                    if (hit._source.logoUrl) {
                        hit._source.documents = [{
                            role:'logo',
                            url: hit._source.logoUrl
                        }]
                    }
                    return new OrganisationViewModel(hit._source);
                }));
            }
            if (offset == 0) {
                self.pagination.loadPagination(0, data.hits.total);
            }

        });
    };
    self.refreshPage(0);
};


var OrganisationsViewModel = function(organisations, userOrgIds) {
    var self = this;

    var userOrgList = [], otherOrgList = [];
    for (var i=0; i<organisations.length; i++) {

        // Attach images to each organisations for display
        var orgView = new OrganisationViewModel(organisations[i]);
        orgView.searchableName = organisations[i].name;
        orgView.searchableDescription = organisations[i].description;

        if (userOrgIds && userOrgIds.indexOf(organisations[i].organisationId) >= 0) {
            userOrgList.push(orgView);
        }
        else {
            otherOrgList.push(orgView)
        }
    }

    var searchableUserList, searchableOtherList;

    self.searchTerm = ko.observable('');
    self.searchName = ko.observable(true);
    self.searchDescription = ko.observable(false);
    self.caseSensitive = ko.observable(false);

    var buildSearch = function() {
        var keys = [];
        if (self.searchName()) {
            keys.push('searchableName');
        }
        if (self.searchDescription()) {
            keys.push('searchableDescription');
        }

        var options = {keys:keys, caseSensitive:self.caseSensitive()};

        searchableUserList = new SearchableList(userOrgList, keys, options);
        searchableOtherList = new SearchableList(otherOrgList, keys, options);
    };

    buildSearch();

    self.delayedSearchTerm = ko.pureComputed(self.searchTerm).extend({rateLimit:{method:'notifyWhenChangesStop', timeout:400}});

    self.delayedSearchTerm.subscribe(function(term) {
        searchableUserList.term(term);
        searchableOtherList.term(term);
        self.pageNum(1);
        self.pageList(buildPageList());
    });

    this.userOrganisations = searchableUserList.results;
    this.otherOrganisations = searchableOtherList.results;

    this.pageNum = ko.observable(1);
    this.organisationsPerPage = 20;
    var maxPageButtons = 10;

    this.totalPages = ko.computed(function() {
        var count = self.userOrganisations().length + self.otherOrganisations().length;
        var pageCount = Math.floor(count / self.organisationsPerPage);
        return count % self.organisationsPerPage > 0 ? pageCount + 1 : pageCount;
    });

    this.currentPage = ko.computed(function() {
        var results = [].concat(self.userOrganisations(), self.otherOrganisations());
        var first = (self.pageNum()-1) * self.organisationsPerPage;
        return results.slice(first, first+self.organisationsPerPage);

    });

    function buildPageList() {
        var pages = [];
        var i;
        var currentPage = self.pageNum();
        var total = self.totalPages();
        if (total <= maxPageButtons) {
            for (i=1; i<=total; i++) {
                pages.push(i);
            }
            return pages;
        }

        if (currentPage <= (maxPageButtons / 2) + 1) {
            for (i=1; i<maxPageButtons; i++) {
                pages.push(i);
            }
            pages.push('..');
            pages.push(total);
            return pages;

        }

        if (currentPage > (total - (maxPageButtons / 2))) {
            pages.push(1);
            pages.push('..');
            for (i=total - maxPageButtons+2; i<=total; i++) {
                pages.push(i);
            }
            return pages;
        }

        pages.push(1);
        pages.push('..');
        var start = currentPage-(maxPageButtons/2)+1;
        for (i=start; i<start+maxPageButtons-2; i++) {
            pages.push(i);
        }
        pages.push('..');
        pages.push(total);
        return pages;
    };

    this.pageList = ko.observableArray(buildPageList());

    this.hasPrev = ko.computed(function() {
        return self.pageNum() > 1;
    });

    this.hasNext = ko.computed(function() {
        return self.pageNum() < self.totalPages();
    });

    this.next = function() {
        if (self.hasNext()) {
            self.gotoPage(self.pageNum()+1);
        }
    };
    this.prev = function() {
        if (self.hasPrev()) {
            self.gotoPage(self.pageNum()-1);
        }
    };

    this.gotoPage = function(page) {
        if (page != '..') {
            self.pageNum(page);
            self.pageList(buildPageList());
            self.pageList.notifySubscribers();
        }
    };

    this.addOrganisation = function() {
        window.location = fcConfig.createOrganisationUrl;
    };

};
var ProjectActivitiesViewModel = function (pActivities, pActivityForms, projectId, sites){
    var self = this;
    self.pActivityForms = pActivityForms;
    self.sites = sites;

    self.projectId = ko.observable();
    self.projectActivities = ko.observableArray();

    self.sortBy = ko.observable();
    self.sortOrder = ko.observable();
    self.sortOptions = [{id: 'name', name:'Name'},{id: 'description', name:'Description'},{id:'transients.status', name:'Status'}];
    self.sortOrderOptions = [{id: 'asc', name:'Ascending'},{id:'desc', name:'Descending'}];
    self.sortBy.subscribe(function(by) {
        self.sort();
    });
    self.sortOrder.subscribe(function(order) {
        self.sort();
    });

    self.sort = function(){
        var by = self.sortBy();
        var order = self.sortOrder() == 'asc' ? '<' : '>';
        if(by && order){
            eval('self.projectActivities.sort(function(left, right) { return left.'+ by +'() == right.'+ by +'() ? 0 : (left.'+ by +'() '+ order +' right.'+ by +'() ? -1 : 1) });');
        }
    };

    self.reset = function(){
        $.each(self.projectActivities(), function(i, obj){
            obj.current(false);
        });
    };

    self.current = function (){
        var pActivity;
        $.each(self.projectActivities(), function(i, obj){
            if(obj.current()){
                pActivity = obj;
            }
        });
        return pActivity;
    };

    self.setCurrent = function(pActivity) {
        self.reset();
        pActivity.current(true);
    };

    self.loadProjectActivitiesVM = function(pActivities, pActivityForms, projectId, sites){
        self.projectId(projectId);
        self.sortBy("name");
        self.sortOrder("asc");
        $.map(pActivities, function (pActivity, i) {
            return self.projectActivities.push(new ProjectActivity(pActivity, pActivityForms, projectId, (i == 0), sites));
        });

        self.sort();
    };

    self.loadProjectActivitiesVM(pActivities, pActivityForms, projectId, sites);

};

var ProjectActivitiesListViewModel = function(pActivitiesVM){
    var self = $.extend(this, pActivitiesVM);
    self.filter = ko.observable(false);

    self.toggleFilter = function () {
        self.filter(!self.filter())
    };

    self.setCurrent = function(pActivity) {
        self.reset();
        pActivity.current(true);
    };
};

var ProjectActivitiesDataViewModel = function(pActivitiesVM){
    var self = $.extend(this, pActivitiesVM);

};

var ProjectActivitiesSettingsViewModel =  function(pActivitiesVM) {

    var self = $.extend(this, pActivitiesVM);

    self.speciesOptions =  [{id: 'ALL_SPECIES', name:'All species'},{id:'SINGLE_SPECIES', name:'Single species'}, {id:'GROUP_OF_SPECIES',name:'A selection or group of species'}];
    self.datesOptions = [60, 90, 120];
    self.formNames = ko.observableArray($.map(self.pActivityForms ? self.pActivityForms : [], function (obj, i) {
        return obj.name;
    }));

    self.addProjectActivity = function() {
        self.reset();
        self.projectActivities.push(new ProjectActivity([], self.pActivityForms, self.projectId(), true, self.sites));
        initialiseValidator();
        showAlert("Successfully added.", "alert-success",  'project-activities-result-placeholder');
    };

    self.saveAccess = function(access){
        var caller = "access";
        return self.genericUpdate(self.current().asJSON(caller), caller);
    };

    self.saveForm = function(){
        var caller = "form";
        return self.genericUpdate(self.current().asJSON(caller), caller);
    };

    self.saveInfo = function(){
        var caller = "info";
        return self.genericUpdate(self.current().asJSON(caller), caller);
    };

    self.saveSpecies = function(){
        var caller = "species";
        return self.genericUpdate(self.current().asJSON(caller), caller);
    };

    self.saveSites = function(){
        var caller = "sites";
        return self.genericUpdate(self.current().asJSON(caller), caller);
    };
    self.saveVisibility = function(){
        var caller = "visibility";
        return self.genericUpdate(self.current().asJSON(caller), caller);
    };

    self.deleteProjectActivity = function() {
        bootbox.confirm("Are you sure you want to delete the survey?", function (result) {
            if (result) {
                var that = this;

                var pActivity;
                $.each(self.projectActivities(), function(i, obj){
                    if(obj.current()){
                        obj.status("deleted");
                        pActivity = obj;
                    }
                });

                if(pActivity.projectActivityId() === undefined){
                    self.projectActivities.remove(pActivity);
                    if(self.projectActivities().length > 0){
                        self.projectActivities()[0].current(true);
                    }
                    showAlert("Successfully deleted.", "alert-success",  'project-activities-result-placeholder');
                }
                else{
                    self.genericUpdate(self.current().asJSON("info"), "info");
                }
            }
        });

    };

    self.genericUpdate = function(model, caller, message){
        if (!$('#project-activities-'+caller+'-validation').validationEngine('validate')){
            return false;
        }

        message = typeof message !== 'undefined' ? message : 'Successfully updated';
        var pActivity = self.current();
        var url = pActivity.projectActivityId() ? fcConfig.projectActivityUpdateUrl + "&id=" +
        pActivity.projectActivityId() : fcConfig.projectActivityCreateUrl;

        var divId = 'project-activities-'+ caller +'-result-placeholder';

        if(caller != "info" && pActivity.projectActivityId() === undefined){
            showAlert("Please save 'Survey Info' details before applying other constraints.", "alert-error",  divId);
            return;
        }

        $.ajax({
            url: url,
            type: 'POST',
            data: model,
            contentType: 'application/json',
            success: function (data) {

                if (data.error) {
                    showAlert("Error :" + data.text, "alert-error", divId);
                }
                else if(data.resp && data.resp.projectActivityId) {
                    $.each(self.projectActivities(), function(i, obj){
                        if(obj.current()){
                            obj.projectActivityId(data.resp.projectActivityId);
                        }
                    });
                    showAlert(message, "alert-success",  divId);
                }
                else{
                    if(pActivity.status() == "deleted"){
                        self.projectActivities.remove(pActivity);
                        if(self.projectActivities().length > 0){
                            self.projectActivities()[0].current(true);
                        }
                        showAlert(message, "alert-success",  divId);
                    }else{
                        showAlert(message, "alert-success",  divId);
                    }
                }
            },
            error: function (data) {
                var status = data.status;
                showAlert("Error : An unhandled error occurred" + data.status, "alert-error", divId);
            }
        });
    };
}

var pActivityInfo = function(o, selected){
    var self = this;
    if(!o) o = {};

    self.projectActivityId = ko.observable(o.projectActivityId);
    self.name = ko.observable(o.name ? o.name : "Survey name");
    self.description = ko.observable(o.description);
    self.status = ko.observable(o.status ? o.status : "active");
    self.startDate = ko.observable(o.startDate).extend({simpleDate:false});
    self.endDate = ko.observable(o.endDate).extend({simpleDate:false});
    self.commentsAllowed = ko.observable(o.commentsAllowed ? o.commentsAllowed : false);
    self.published = ko.observable(o.published ? o.published : false);
    self.logoUrl = ko.observable(fcConfig.imageLocation + "/no-image-2.png");
    self.current = ko.observable(selected);

    self.transients = self.transients || {};
    var isBeforeToday = function(date) {
        return moment(date) < moment().startOf('day');
    };
    var calculateDurationInDays = function(startDate, endDate) {
        var start = moment(startDate);
        var end = moment(endDate);
        var days = end.diff(start, 'days');
        return days < 0? 0: days;
    };

    self.transients.daysSince = ko.pureComputed(function() {
        var startDate = self.startDate();
        if (!startDate) return -1;
        var start = moment(startDate);
        var today = moment();
        return today.diff(start, 'days');
    });

    self.transients.daysRemaining = ko.pureComputed(function() {
        var end = self.endDate();
        return end? isBeforeToday(end)? 0: calculateDurationInDays(undefined, end) + 1: -1;
    });
    self.transients.daysTotal = ko.pureComputed(function() {
        return self.startDate()? calculateDurationInDays(self.startDate(), self.endDate()): -1;
    });
    self.transients.status = ko.pureComputed(function(){
        var status = "";
        if(self.transients.daysSince() < 0 || (self.transients.daysSince() >= 0 && self.transients.daysRemaining() > 0)){
            status = "Active, Not yet started"
        }
        else if(self.transients.daysSince() >= 0 && self.transients.daysRemaining() < 0){
            status = "Active, In progress"
        }
        else if(self.transients.daysSince() >= 0 && self.transients.daysRemaining() == 0){
            status = "Inactive, Completed"
        }
        return status;
    });

};

var ProjectActivity = function (o, pActivityForms, projectId, selected, sites){
    if(!o) o = {};
    if(!pActivityForms) pActivityForms = [];
    if(!projectId) projectId = "";
    if(!selected) selected = false;
    if(!sites) sites = [];

    var self = $.extend(this, new pActivityInfo(o, selected));
    self.projectId = ko.observable(o.projectId ? o.projectId  : projectId);
    self.restrictRecordToSites = ko.observable(o.restrictRecordToSites);
    self.pActivityFormName = ko.observable(o.pActivityFormName);
    self.species = new SpeciesConstraintViewModel(o.species);
    self.visibility = new SurveyVisibilityViewModel(o.visibility);

    self.transients = self.transients || {};
    self.transients.siteSelectUrl = ko.observable(fcConfig.siteSelectUrl);
    self.transients.siteCreateUrl = ko.observable(fcConfig.siteCreateUrl);
    self.transients.siteUploadUrl = ko.observable(fcConfig.siteUploadUrl);

    self.transients.warning = ko.computed(function(){
        return self.projectActivityId() === undefined ? true : false;
    });
    self.sites = ko.observableArray($.map(sites ? sites : [], function (obj, i) {
        return new SiteList(obj, o.sites);
    }));

    var images = [];
    $.each(pActivityForms, function(index, form){
        if(form.name == self.pActivityFormName()){
            images = form.images ? form.images : [];
        }
    });

    self.pActivityFormImages =  ko.observableArray($.map(images, function (obj, i) {
        return new ImagesViewModel(obj);
    }));

    self.pActivityForms = pActivityForms;

    self.pActivityFormName.subscribe(function(formName) {
        self.pActivityFormImages.removeAll();
        $.each(self.pActivityForms, function(index, form){
            if(form.name == formName && form.images){
                for(var i =0; i < form.images.length; i++){
                    self.pActivityFormImages.push(new ImagesViewModel(form.images[i]));
                }
            }
        });
    });

    self.asJSON = function(by){
        var jsData;
        if(by == "access"){
            jsData = {};
            jsData.access =  ko.mapping.toJS(self.access, {ignore:[]});
        }
        else if(by == "form"){
            jsData = {};
            jsData.pActivityFormName = self.pActivityFormName();
        }
        else if(by == "info"){
            jsData = ko.mapping.toJS(self, {ignore:['current','pActivityForms','pActivityFormImages', 'access', 'species','sites','transients','endDate']});
            jsData.endDate = moment(self.endDate(), 'YYYY-MM-DDThh:mm:ssZ').isValid() ? self.endDate() : "";
        }
        else if(by == "species"){
            jsData = {};
            jsData.species = self.species.asJson();
        }
        else if(by == "sites"){
            jsData = {};
            var sites = [];
            $.each(self.sites(), function(index, site){
                if(site.added()){
                    sites.push(site.siteId());
                }
            });
            jsData.sites = sites;
            jsData.restrictRecordToSites = self.restrictRecordToSites();
        }
        else if(by == "visibility"){
            jsData = {};
            jsData.visibility = ko.mapping.toJS(self.visibility, {ignore:['transients']});
        }

        return JSON.stringify(jsData, function (key, value) { return value === undefined ? "" : value; });
    }
};

var SiteList = function(o, surveySites){
    var self = this;
    if(!o) o = {};
    if(!surveySites) surveySites = {};

    self.siteId = ko.observable(o.siteId);
    self.name = ko.observable(o.name);
    self.added = ko.observable(false);
    self.siteUrl = ko.observable(fcConfig.siteViewUrl + "/" + self.siteId())

    self.addSite = function(){
        self.added(true);
    };
    self.removeSite = function(){
        self.added(false);
    };

    self.load = function(surveySites){
        $.each(surveySites, function( index, siteId ) {
            if(siteId == self.siteId()){
                self.added(true);
            }
        });
    };
    self.load(surveySites);

};

var SpeciesConstraintViewModel = function (o){
    var self = this;
    if(!o) o = {};

    self.type = ko.observable(o.type);
    self.allSpeciesLists  = new SpeciesListsViewModel();
    self.singleSpecies = new Species(o.singleSpecies);
    self.speciesLists = ko.observableArray($.map(o.speciesLists ? o.speciesLists : [], function (obj, i) {
        return new SpeciesList(obj);
    }));
    self.newSpeciesLists = new SpeciesList();

    self.transients = {};
    self.transients.bioProfileUrl =  ko.computed(function (){
        return  fcConfig.bieUrl + '/species/' + self.singleSpecies.guid();
    });

    self.transients.bioSearch = ko.observable(fcConfig.speciesSearchUrl);
    self.transients.allowedListTypes = [
    {id:'SPECIES_CHARACTERS', name:'SPECIES_CHARACTERS'},
    {id:'CONSERVATION_LIST', name:'CONSERVATION_LIST'},
    {id:'SENSITIVE_LIST', name:'SENSITIVE_LIST'},
    {id:'LOCAL_LIST', name:'LOCAL_LIST'},
    {id:'COMMON_TRAIT', name:'COMMON_TRAIT'},
    {id:'COMMON_HABITAT', name:'COMMON_HABITAT'},
    {id:'TEST', name:'TEST'},
    {id:'OTHER', name:'OTHER'}];

    self.transients.showAddSpeciesLists = ko.observable(false);
    self.transients.showExistingSpeciesLists = ko.observable(false);
    self.transients.toggleShowAddSpeciesLists = function (){
        self.transients.showAddSpeciesLists(!self.transients.showAddSpeciesLists());
    };
    self.transients.toggleShowExistingSpeciesLists = function (){
        self.transients.showExistingSpeciesLists(!self.transients.showExistingSpeciesLists());
        if(self.transients.showExistingSpeciesLists()){
            self.allSpeciesLists.loadAllSpeciesLists();
        }
    };

    self.addSpeciesLists = function (lists){
        lists.transients.check(true);
        self.speciesLists.push(lists);
    };
    self.removeSpeciesLists = function (lists){
        self.speciesLists.remove(lists);
    };
    self.groupInfoVisible = ko.computed(function() {
        return (self.type() == "GROUP_OF_SPECIES");
    });
    self.singleInfoVisible = ko.computed(function() {
        return (self.type() == "SINGLE_SPECIES");
    });
    self.type.subscribe(function(type) {
        if(self.type() == "SINGLE_SPECIES"){
        }else if(self.type() == "GROUP_OF_SPECIES"){
        }
    });

    self.asJson = function(){
        var jsData = {};
        if(self.type() == "ALL_SPECIES"){
            jsData.type = self.type();
        }
        else if(self.type() == "SINGLE_SPECIES"){
            jsData.type = self.type();
            jsData.singleSpecies = ko.mapping.toJS(self.singleSpecies, {ignore:['transients']});
        }
        else if(self.type() == "GROUP_OF_SPECIES"){
            jsData.type = self.type();
            jsData.speciesLists = ko.mapping.toJS(self.speciesLists, {ignore:['listType','fullName','itemCount', 'description', 'listType','allSpecies','transients']});
        }
        return jsData;
    };

    self.saveNewSpeciesName = function(){
        if (!$('#project-activities-species-validation').validationEngine('validate')){
            return;
        }

        var jsData = {};
        jsData.listName = self.newSpeciesLists.listName();
        jsData.listType = self.newSpeciesLists.listType();
        jsData.description = self.newSpeciesLists.description();
        jsData.listItems = "";

        var lists = ko.mapping.toJS(self.newSpeciesLists);
        $.each(lists.allSpecies, function( index, species ) {
            if(index == 0){
                jsData.listItems = species.name;
            }else{
                jsData.listItems =  jsData.listItems + "," + species.name;
            }
        });
        // Add bulk species names.
        if(jsData.listItems == "") {
            jsData.listItems = self.newSpeciesLists.transients.bulkSpeciesNames();
        }else{
            jsData.listItems = jsData.listItems + "," + self.newSpeciesLists.transients.bulkSpeciesNames();
        }

        var model = JSON.stringify(jsData, function (key, value) { return value === undefined ? "" : value; });
        var divId = 'project-activities-species-result-placeholder';
        $("#addNewSpecies-status").show();
        $.ajax({
            url: fcConfig.addNewSpeciesListsUrl,
            type: 'POST',
            data: model,
            contentType: 'application/json',
            success: function (data) {
                if (data.error) {
                    showAlert("Error :" + data.error, "alert-error", divId);
                }
                else {
                    showAlert("Successfully added the new species list - "+self.newSpeciesLists.listName() +" ("+ data.id+")", "alert-success", divId);
                    self.newSpeciesLists.dataResourceUid(data.id);
                    self.speciesLists.push(new SpeciesList(ko.mapping.toJS(self.newSpeciesLists)));
                    self.newSpeciesLists = new SpeciesList();
                    self.transients.toggleShowAddSpeciesLists();
                }
                $("#addNewSpecies-status").hide();
            },
            error: function (data) {
                showAlert("Error : An unhandled error occurred" + data.status, "alert-error", divId);
                $("#addNewSpecies-status").hide();
            }
        });
    };

};

var SpeciesListsViewModel = function(o){
    var self = this;
    if(!o) o = {};

    self.allSpeciesListsToSelect = ko.observableArray();
    self.offset = ko.observable(0);
    self.max = ko.observable(100);
    self.listCount = ko.observable();
    self.isNext = ko.computed(function() {
        var status = false;
        if(self.listCount() > 0){
            var maxOffset = self.listCount() / self.max();
            if(self.offset() < Math.ceil(maxOffset)-1) {
                status = true;
            }
        }
        return status;
    });

    self.isPrevious = ko.computed(function() {
        return (self.offset() > 0);
    });

    self.next = function(){
        if(self.listCount() > 0){
            var maxOffset = self.listCount() / self.max();
            if(self.offset() < Math.ceil(maxOffset)-1) {
                self.offset(self.offset()+1);
                self.loadAllSpeciesLists();
            }
        }
    };

    self.previous = function(){
        if(self.offset() > 0){
            var newOffset = self.offset() - 1;
            self.offset(newOffset);
            self.loadAllSpeciesLists();
        }
    };

    self.loadAllSpeciesLists = function (){
        var url = fcConfig.speciesListUrl + "?sort=listName&offset="+self.offset()+"&max="+self.max();
        $.ajax({
            url: url,
            type: 'GET',
            contentType: 'application/json',
            success: function (data) {
                if (data.error) {
                    showAlert("Error :" + data.text, "alert-error", divId);
                }
                else {
                    self.listCount(data.listCount);
                    self.allSpeciesListsToSelect($.map(data.lists ? data.lists : [], function (obj, i) {
                            return new SpeciesList(obj);
                        })
                    );
                }
            },
            error: function (data) {
                var status = data.status;
                showAlert("Error : An unhandled error occurred" + data.status, "alert-error", divId);
            }
        });
    };

};

var SpeciesList = function(o){
    var self = this;
    if(!o) o = {};

    self.listName = ko.observable(o.listName);
    self.dataResourceUid = ko.observable(o.dataResourceUid);

    self.listType = ko.observable(o.listType);
    self.fullName = ko.observable(o.fullName);
    self.itemCount = ko.observable(o.itemCount);

    // Only used for new species.
    self.description = ko.observable(o.description);
    self.listType = ko.observable(o.listType);
    self.allSpecies = ko.observableArray();
    self.addNewSpeciesName = function(){
        self.allSpecies.push(new Species());
    };
    self.removeNewSpeciesName = function(species){
        self.allSpecies.remove(species);
    };

    self.transients = {};
    self.transients.bulkSpeciesNames = ko.observable(o.bulkSpeciesNames);
    self.transients.url  = ko.observable(fcConfig.speciesListsServerUrl + "/speciesListItem/list/" + o.dataResourceUid);
    self.transients.check = ko.observable(false);
};

var Species = function(o){
    var self = this;
    if(!o) o = {};
    self.name = ko.observable(o.name);
    self.guid = ko.observable(o.guid);

    self.transients = {};
    self.transients.name = ko.observable(o.name);
    self.transients.guid = ko.observable(o.guid);

    self.focusLost = function(event) {
        self.name(self.transients.name());
        self.guid(self.transients.guid());
    };

    self.transients.guid.subscribe(function(newValue) {
        self.name(self.transients.name());
        self.guid(self.transients.guid());
    });
};

var ImagesViewModel = function(image){
    var self = this;
    if(!image) image = {};

    self.thumbnail = ko.observable(image.thumbnail);
    self.url = ko.observable(image.url);
};

var SurveyVisibilityViewModel = function(o){
    var self = this;
    if(!o) o = {};
    self.constraint = ko.observable(o.constraint ? o.constraint : 'PUBLIC');   // 'PUBLIC', 'PUBLIC_WITH_SET_DATE', 'EMBARGO'
    self.setDate = ko.observable(o.setDate ? o.setDate : 60);     // 60, 90, 120 days
    self.embargoDate = ko.observable(o.embargoDate).extend({simpleDate:false});
};

function initialiseValidator() {
    var tabs = ['info','species','form', 'access','visibility'];
    $.each(tabs, function( index, label ) {
        $('#project-activities-'+ label +'-validation').validationEngine();
    });
};

/**
 * User: MEW
 * Date: 18/06/13
 * Time: 2:24 PM
 */

//iterates over the outputs specified in the meta-model and builds a temp object for
// each containing the name, and the scores and id of any matching outputs in the data
ko.bindingHandlers.foreachModelOutput = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        if (valueAccessor() === undefined) {
            var dummyRow = {name: 'No model was found for this activity', scores: [], outputId: '', editLink:''};
            ko.applyBindingsToNode(element, { foreach: [dummyRow] });
            return { controlsDescendantBindings: true };
        }
        var metaOutputs = ko.utils.unwrapObservable(valueAccessor()),// list of String names of outputs
            activity = bindingContext.$data,// activity data
            transformedOutputs = [];//created list of temp objects

        $.each(metaOutputs, function (i, name) { // for each output name
            var scores = [],
                outputId = '',
                editLink = fcConfig.serverUrl + "/output/";

            // search for corresponding outputs in the data
            $.each(activity.outputs(), function (i,output) { // iterate output data in the activity to
                                                             // find any matching the meta-model name
                if (output.name === name) {
                    outputId = output.outputId;
                    $.each(output.scores, function (k, v) {
                        scores.push({key: k, value: v});
                    });
                }
            });

            if (outputId) {
                // build edit link
                editLink += 'edit/' + outputId +
                    "?returnTo=" + returnTo;
            } else {
                // build create link
                editLink += 'create?activityId=' + activity.activityId +
                    '&outputName=' + encodeURIComponent(name) +
                    "&returnTo=" + returnTo;
            }
            // build the array that we will actually iterate over in the inner template
            transformedOutputs.push({name: name, scores: scores, outputId: outputId,
                editLink: editLink});
        });

        // re-cast the binding to iterate over our new array
        ko.applyBindingsToNode(element, { foreach: transformedOutputs });
        return { controlsDescendantBindings: true };
    }
};
ko.virtualElements.allowedBindings.foreachModelOutput = true;

// handle activity accordion
$('#activities').
    on('show', 'div.collapse', function() {
        $(this).parents('tr').prev().find('td:first-child a').empty()
            .html("&#9660;").attr('title','hide').parent('a').tooltip();
    }).
    on('hide', 'div.collapse', function() {
        $(this).parents('tr').prev().find('td:first-child a').empty()
            .html("&#9658;").attr('title','expand');
    }).
    on('shown', 'div.collapse', function() {
        trackState();
    }).
    on('hidden', 'div.collapse', function() {
        trackState();
    });

function trackState () {
    var $leaves = $('#activityList div.collapse'),
        state = [];
    $.each($leaves, function (i, leaf) {
        if ($(leaf).hasClass('in')) {
            state.push($(leaf).attr('id'));
        }
    });
    console.log('state stored = ' + state);
    amplify.store.sessionStorage('output-accordion-state',state);
}

function readState () {
    var $leaves = $('#activityList div.collapse'),
        state = amplify.store.sessionStorage('output-accordion-state'),
        id;
    console.log('state retrieved = ' + state);
    $.each($leaves, function (i, leaf) {
        id = $(leaf).attr('id');
        if (($.inArray(id, state) > -1)) {
            $(leaf).collapse('show');
        }
    });
}

var image = function(props) {

    var imageObj = {
        id:props.id,
        name:props.name,
        size:props.size,
        url: props.url,
        thumbnail_url: props.thumbnail_url,
        viewImage : function() {
            window['showImageInViewer'](this.id, this.url, this.name);
        }
    };
    return imageObj;
};

ko.bindingHandlers.photoPoint = {
    init: function(element, valueAccessor) {

    }
}


ko.bindingHandlers.photoPointUpload = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {

        var defaultConfig = {
            maxWidth: 300,
            minWidth:150,
            minHeight:150,
            maxHeight: 300,
            previewSelector: '.preview'
        };
        var size = ko.observable();
        var progress = ko.observable();
        var error = ko.observable();
        var complete = ko.observable(true);

        var uploadProperties = {

            size: size,
            progress: progress,
            error:error,
            complete:complete

        };
        var innerContext = bindingContext.createChildContext(bindingContext);
        ko.utils.extend(innerContext, uploadProperties);

        var config = valueAccessor();
        config = $.extend({}, config, defaultConfig);

        var target = config.target; // Expected to be a ko.observableArray
        $(element).fileupload({
            url:config.url,
            autoUpload:true,
            forceIframeTransport: true
        }).on('fileuploadadd', function(e, data) {
            complete(false);
            progress(1);
        }).on('fileuploadprocessalways', function(e, data) {
            if (data.files[0].preview) {
                if (config.previewSelector !== undefined) {
                    var previewElem = $(element).parent().find(config.previewSelector);
                    previewElem.append(data.files[0].preview);
                }
            }
        }).on('fileuploadprogressall', function(e, data) {
            progress(Math.floor(data.loaded / data.total * 100));
            size(data.total);
        }).on('fileuploaddone', function(e, data) {

//            var resultText = $('pre', data.result).text();
//            var result = $.parseJSON(resultText);


            var result = data.result;
            if (!result) {
                result = {};
                error('No response from server');
            }

            if (result.files[0]) {
                target.push(result.files[0]);
                complete(true);
            }
            else {
                error(result.error);
            }

        }).on('fileuploadfail', function(e, data) {
            error(data.errorThrown);
        });

        ko.applyBindingsToDescendants(innerContext, element);

        return { controlsDescendantBindings: true };
    }
};

ko.bindingHandlers.imageUpload = {
    init: function(element, valueAccessor) {

        var config = {autoUpload:true};
        var observable;
        var params = valueAccessor();
        if (ko.isObservable(params)) {
            observable = params;
        }
        else {
            observable = params.target;
            $.extend(config, params.config);
        }

        var addCallbacks = function() {
            // The upload URL is specified using the data-url attribute to allow it to be easily pulled from the
            // application configuration.
            $(element).fileupload('option', 'completed', function(e, data) {
                if (data.result && data.result.files) {
                    $.each(data.result.files, function(index, obj) {
                        if (observable.hasOwnProperty('push')) {
                            observable.push(image(obj));
                        }
                        else {
                            observable(image(obj))
                        }
                    });
                }
            });
            $(element).fileupload('option', 'destroyed', function(e, data) {
                var filename = $(e.currentTarget).attr('data-filename');

                if (observable.hasOwnProperty('remove')) {
                    var images = observable();

                    // We rely on the template rendering the filename into the delete button so we can identify which
                    // object has been deleted.
                    $.each(images, function(index, obj) {
                        if (obj.name === filename) {
                            observable.remove(obj);
                            return false;
                        }
                    });
                }
                else {
                    observable({})
                }
            });

        };

        $(element).fileupload(config);

        var value = ko.utils.unwrapObservable(observable);
        var isArray = value.hasOwnProperty('length');

        if ((isArray && value.length > 0) || (!isArray && value['name'] !== undefined)) {
            // Render the existing model items - we are currently storing all of the metadata needed by the
            // jquery-file-upload plugin in the model but we should probably only store the core data and decorate
            // it in the templating code (e.g. the delete URL and HTTP method).
            $(element).fileupload('option', 'completed', function(e, data) {
                addCallbacks();
            });
            var data = {result:{}};
            if (isArray)  {
                data.result.files = value
            }
            else {
                data.result.files = [value];
            }
            var doneFunction = $(element).fileupload('option', 'done');
            var e = {isDefaultPrevented:function(){return false;}};

            doneFunction.call(element, e, data);
        }
        else {
            addCallbacks();
        }

        // Enable iframe cross-domain access via redirect option:
        $(element).fileupload(
            'option',
            'redirect',
            window.location.href.replace(
                /\/[^\/]*$/,
                '/cors/result.html?%s'
            )
        );

    }

};

ko.bindingHandlers.editDocument = {
    init:function(element, valueAccessor) {
        if (ko.isObservable(valueAccessor())) {
            var document = ko.utils.unwrapObservable(valueAccessor());
            if (typeof document.status == 'function') {
                document.status.subscribe(function(status) {
                    if (status == 'deleted') {
                        valueAccessor()(null);
                    }
                });
            }
        }
        var options = {
            name:'documentEditTemplate',
            data:valueAccessor()
        };
        return ko.bindingHandlers['template'].init(element, function() {return options;});
    },
    update:function(element, valueAccessor, allBindings, viewModel, bindingContext) {
        var options = {
            name:'documentEditTemplate',
            data:valueAccessor()
        };
        ko.bindingHandlers['template'].update(element, function() {return options;}, allBindings, viewModel, bindingContext);
    }
}
/*!
 Based on ndef.parser, by Raphael Graf(r@undefined.ch)
 http://www.undefined.ch/mparser/index.html

 Ported to JavaScript and modified by Matthew Crumley (email@matthewcrumley.com, http://silentmatt.com/)

 You are free to use and modify this code in anyway you find useful. Please leave this comment in the code
 to acknowledge its original source. If you feel like it, I enjoy hearing about projects that use my code,
 but don't feel like you have to let me know or ask permission.
*/

//  Added by stlsmiths 6/13/2011
//  re-define Array.indexOf, because IE doesn't know it ...
//
//  from http://stellapower.net/content/javascript-support-and-arrayindexof-ie
	if (!Array.indexOf) {
		Array.prototype.indexOf = function (obj, start) {
			for (var i = (start || 0); i < this.length; i++) {
				if (this[i] === obj) {
					return i;
				}
			}
			return -1;
		}
	}

var Parser = (function (scope) {
	function object(o) {
		function F() {}
		F.prototype = o;
		return new F();
	}

	var TNUMBER = 0;
	var TOP1 = 1;
	var TOP2 = 2;
	var TVAR = 3;
	var TFUNCALL = 4;

	function Token(type_, index_, prio_, number_) {
		this.type_ = type_;
		this.index_ = index_ || 0;
		this.prio_ = prio_ || 0;
		this.number_ = (number_ !== undefined && number_ !== null) ? number_ : 0;
		this.toString = function () {
			switch (this.type_) {
			case TNUMBER:
				return this.number_;
			case TOP1:
			case TOP2:
			case TVAR:
				return this.index_;
			case TFUNCALL:
				return "CALL";
			default:
				return "Invalid Token";
			}
		};
	}

	function Expression(tokens, ops1, ops2, functions) {
		this.tokens = tokens;
		this.ops1 = ops1;
		this.ops2 = ops2;
		this.functions = functions;
	}

	// Based on http://www.json.org/json2.js
    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\'\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            "'" : "\\'",
            '\\': '\\\\'
        };

	function escapeValue(v) {
		if (typeof v === "string") {
			escapable.lastIndex = 0;
	        return escapable.test(v) ?
	            "'" + v.replace(escapable, function (a) {
	                var c = meta[a];
	                return typeof c === 'string' ? c :
	                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
	            }) + "'" :
	            "'" + v + "'";
		}
		return v;
	}

	Expression.prototype = {
		simplify: function (values) {
			values = values || {};
			var nstack = [];
			var newexpression = [];
			var n1;
			var n2;
			var f;
			var L = this.tokens.length;
			var item;
			var i = 0;
			for (i = 0; i < L; i++) {
				item = this.tokens[i];
				var type_ = item.type_;
				if (type_ === TNUMBER) {
					nstack.push(item);
				}
				else if (type_ === TVAR && (item.index_ in values)) {
					item = new Token(TNUMBER, 0, 0, values[item.index_]);
					nstack.push(item);
				}
				else if (type_ === TOP2 && nstack.length > 1) {
					n2 = nstack.pop();
					n1 = nstack.pop();
					f = this.ops2[item.index_];
					item = new Token(TNUMBER, 0, 0, f(n1.number_, n2.number_));
					nstack.push(item);
				}
				else if (type_ === TOP1 && nstack.length > 0) {
					n1 = nstack.pop();
					f = this.ops1[item.index_];
					item = new Token(TNUMBER, 0, 0, f(n1.number_));
					nstack.push(item);
				}
				else {
					while (nstack.length > 0) {
						newexpression.push(nstack.shift());
					}
					newexpression.push(item);
				}
			}
			while (nstack.length > 0) {
				newexpression.push(nstack.shift());
			}

			return new Expression(newexpression, object(this.ops1), object(this.ops2), object(this.functions));
		},

		substitute: function (variable, expr) {
			if (!(expr instanceof Expression)) {
				expr = new Parser().parse(String(expr));
			}
			var newexpression = [];
			var L = this.tokens.length;
			var item;
			var i = 0;
			for (i = 0; i < L; i++) {
				item = this.tokens[i];
				var type_ = item.type_;
				if (type_ === TVAR && item.index_ === variable) {
					for (var j = 0; j < expr.tokens.length; j++) {
						var expritem = expr.tokens[j];
						var replitem = new Token(expritem.type_, expritem.index_, expritem.prio_, expritem.number_);
						newexpression.push(replitem);
					}
				}
				else {
					newexpression.push(item);
				}
			}

			var ret = new Expression(newexpression, object(this.ops1), object(this.ops2), object(this.functions));
			return ret;
		},

		evaluate: function (values) {
			values = values || {};
			var nstack = [];
			var n1;
			var n2;
			var f;
			var L = this.tokens.length;
			var item;
			var i = 0;
			for (i = 0; i < L; i++) {
				item = this.tokens[i];
				var type_ = item.type_;
				if (type_ === TNUMBER) {
					nstack.push(item.number_);
				}
				else if (type_ === TOP2) {
					n2 = nstack.pop();
					n1 = nstack.pop();
					f = this.ops2[item.index_];
					nstack.push(f(n1, n2));
				}
				else if (type_ === TVAR) {
					if (item.index_ in values) {
						nstack.push(values[item.index_]);
					}
					else if (item.index_ in this.functions) {
						nstack.push(this.functions[item.index_]);
					}
					else {
						throw new Error("undefined variable: " + item.index_);
					}
				}
				else if (type_ === TOP1) {
					n1 = nstack.pop();
					f = this.ops1[item.index_];
					nstack.push(f(n1));
				}
				else if (type_ === TFUNCALL) {
					n1 = nstack.pop();
					f = nstack.pop();
					if (f.apply && f.call) {
						if (Object.prototype.toString.call(n1) == "[object Array]") {
							nstack.push(f.apply(undefined, n1));
						}
						else {
							nstack.push(f.call(undefined, n1));
						}
					}
					else {
						throw new Error(f + " is not a function");
					}
				}
				else {
					throw new Error("invalid Expression");
				}
			}
			if (nstack.length > 1) {
				throw new Error("invalid Expression (parity)");
			}
			return nstack[0];
		},

		toString: function (toJS) {
			var nstack = [];
			var n1;
			var n2;
			var f;
			var L = this.tokens.length;
			var item;
			var i = 0;
			for (i = 0; i < L; i++) {
				item = this.tokens[i];
				var type_ = item.type_;
				if (type_ === TNUMBER) {
					nstack.push(escapeValue(item.number_));
				}
				else if (type_ === TOP2) {
					n2 = nstack.pop();
					n1 = nstack.pop();
					f = item.index_;
					if (toJS && f == "^") {
						nstack.push("Math.pow(" + n1 + "," + n2 + ")");
					}
					else {
						nstack.push("(" + n1 + f + n2 + ")");
					}
				}
				else if (type_ === TVAR) {
					nstack.push(item.index_);
				}
				else if (type_ === TOP1) {
					n1 = nstack.pop();
					f = item.index_;
					if (f === "-") {
						nstack.push("(" + f + n1 + ")");
					}
					else {
						nstack.push(f + "(" + n1 + ")");
					}
				}
				else if (type_ === TFUNCALL) {
					n1 = nstack.pop();
					f = nstack.pop();
					nstack.push(f + "(" + n1 + ")");
				}
				else {
					throw new Error("invalid Expression");
				}
			}
			if (nstack.length > 1) {
				throw new Error("invalid Expression (parity)");
			}
			return nstack[0];
		},

		variables: function () {
			var L = this.tokens.length;
			var vars = [];
			for (var i = 0; i < L; i++) {
				var item = this.tokens[i];
				if (item.type_ === TVAR && (vars.indexOf(item.index_) == -1)) {
					vars.push(item.index_);
				}
			}

			return vars;
		},

		toJSFunction: function (param, variables) {
			var f = new Function(param, "with(Parser.values) { return " + this.simplify(variables).toString(true) + "; }");
			return f;
		}
	};

	function add(a, b) {
		return Number(a) + Number(b);
	}
	function sub(a, b) {
		return a - b; 
	}
	function mul(a, b) {
		return a * b;
	}
	function div(a, b) {
		return a / b;
	}
	function mod(a, b) {
		return a % b;
	}
	function concat(a, b) {
		return "" + a + b;
	}
	function sinh(a) {
		return Math.sinh ? Math.sinh(a) : ((Math.exp(a) - Math.exp(-a)) / 2);
	}
	function cosh(a) {
		return Math.cosh ? Math.cosh(a) : ((Math.exp(a) + Math.exp(-a)) / 2);
	}
	function tanh(a) {
		if (Math.tanh) return Math.tanh(a);
		if(a === Infinity) return 1;
		if(a === -Infinity) return -1;
		return (Math.exp(a) - Math.exp(-a)) / (Math.exp(a) + Math.exp(-a));
	}
	function asinh(a) {
		if (Math.asinh) return Math.asinh(a);
		if(a === -Infinity) return a;
		return Math.log(a + Math.sqrt(a * a + 1));
	}
	function acosh(a) {
		return Math.acosh ? Math.acosh(a) : Math.log(a + Math.sqrt(a * a - 1));
	}
	function atanh(a) {
		return Math.atanh ? Math.atanh(a) : (Math.log((1+a)/(1-a)) / 2);
	}
	function log10(a) {
	      return Math.log(a) * Math.LOG10E;
	}
	function neg(a) {
		return -a;
	}
	function trunc(a) {
		if(Math.trunc) return Math.trunc(a);
		else return x < 0 ? Math.ceil(x) : Math.floor(x);
	}
	function random(a) {
		return Math.random() * (a || 1);
	}
	function fac(a) { //a!
		a = Math.floor(a);
		var b = a;
		while (a > 1) {
			b = b * (--a);
		}
		return b;
	}

	// TODO: use hypot that doesn't overflow
	function hypot() {
		if(Math.hypot) return Math.hypot.apply(this, arguments);
		var y = 0;
		var length = arguments.length;
		for (var i = 0; i < length; i++) {
			if (arguments[i] === Infinity || arguments[i] === -Infinity) {
				return Infinity;
			}
			y += arguments[i] * arguments[i];
		}
		return Math.sqrt(y);
	}

	function append(a, b) {
		if (Object.prototype.toString.call(a) != "[object Array]") {
			return [a, b];
		}
		a = a.slice();
		a.push(b);
		return a;
	}

	function Parser() {
		this.success = false;
		this.errormsg = "";
		this.expression = "";

		this.pos = 0;

		this.tokennumber = 0;
		this.tokenprio = 0;
		this.tokenindex = 0;
		this.tmpprio = 0;

		this.ops1 = {
			"sin": Math.sin,
			"cos": Math.cos,
			"tan": Math.tan,
			"asin": Math.asin,
			"acos": Math.acos,
			"atan": Math.atan,
			"sinh": sinh,
			"cosh": cosh,
			"tanh": tanh,
			"asinh": asinh,
			"acosh": acosh,
			"atanh": atanh,
			"sqrt": Math.sqrt,
			"log": Math.log,
			"lg" : log10,
			"log10" : log10,
			"abs": Math.abs,
			"ceil": Math.ceil,
			"floor": Math.floor,
			"round": Math.round,
			"trunc": trunc,
			"-": neg,
			"exp": Math.exp
		};

		this.ops2 = {
			"+": add,
			"-": sub,
			"*": mul,
			"/": div,
			"%": mod,
			"^": Math.pow,
			",": append,
			"||": concat
		};

		this.functions = {
			"random": random,
			"fac": fac,
			"min": Math.min,
			"max": Math.max,
			"hypot": hypot,
			"pyt": hypot, // backward compat
			"pow": Math.pow,
			"atan2": Math.atan2
		};

		this.consts = {
			"E": Math.E,
			"PI": Math.PI
		};
	}

	Parser.parse = function (expr) {
		return new Parser().parse(expr);
	};

	Parser.evaluate = function (expr, variables) {
		return Parser.parse(expr).evaluate(variables);
	};

	Parser.Expression = Expression;

	Parser.values = {
		sin: Math.sin,
		cos: Math.cos,
		tan: Math.tan,
		asin: Math.asin,
		acos: Math.acos,
		atan: Math.atan,
		sinh: sinh,
		cosh: cosh,
		tanh: tanh,
		asinh: asinh,
		acosh: acosh,
		atanh: atanh,
		sqrt: Math.sqrt,
		log: Math.log,
		lg: log10,
		log10: log10,
		abs: Math.abs,
		ceil: Math.ceil,
		floor: Math.floor,
		round: Math.round,
		trunc: trunc,
		random: random,
		fac: fac,
		exp: Math.exp,
		min: Math.min,
		max: Math.max,
		hypot: hypot,
		pyt: hypot, // backward compat
		pow: Math.pow,
		atan2: Math.atan2,
		E: Math.E,
		PI: Math.PI
	};

	var PRIMARY      = 1 << 0;
	var OPERATOR     = 1 << 1;
	var FUNCTION     = 1 << 2;
	var LPAREN       = 1 << 3;
	var RPAREN       = 1 << 4;
	var COMMA        = 1 << 5;
	var SIGN         = 1 << 6;
	var CALL         = 1 << 7;
	var NULLARY_CALL = 1 << 8;

	Parser.prototype = {
		parse: function (expr) {
			this.errormsg = "";
			this.success = true;
			var operstack = [];
			var tokenstack = [];
			this.tmpprio = 0;
			var expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
			var noperators = 0;
			this.expression = expr;
			this.pos = 0;

			while (this.pos < this.expression.length) {
				if (this.isOperator()) {
					if (this.isSign() && (expected & SIGN)) {
						if (this.isNegativeSign()) {
							this.tokenprio = 2;
							this.tokenindex = "-";
							noperators++;
							this.addfunc(tokenstack, operstack, TOP1);
						}
						expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
					}
					else if (this.isComment()) {

					}
					else {
						if ((expected & OPERATOR) === 0) {
							this.error_parsing(this.pos, "unexpected operator");
						}
						noperators += 2;
						this.addfunc(tokenstack, operstack, TOP2);
						expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
					}
				}
				else if (this.isNumber()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing(this.pos, "unexpected number");
					}
					var token = new Token(TNUMBER, 0, 0, this.tokennumber);
					tokenstack.push(token);

					expected = (OPERATOR | RPAREN | COMMA);
				}
				else if (this.isString()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing(this.pos, "unexpected string");
					}
					var token = new Token(TNUMBER, 0, 0, this.tokennumber);
					tokenstack.push(token);

					expected = (OPERATOR | RPAREN | COMMA);
				}
				else if (this.isLeftParenth()) {
					if ((expected & LPAREN) === 0) {
						this.error_parsing(this.pos, "unexpected \"(\"");
					}

					if (expected & CALL) {
						noperators += 2;
						this.tokenprio = -2;
						this.tokenindex = -1;
						this.addfunc(tokenstack, operstack, TFUNCALL);
					}

					expected = (PRIMARY | LPAREN | FUNCTION | SIGN | NULLARY_CALL);
				}
				else if (this.isRightParenth()) {
				    if (expected & NULLARY_CALL) {
						var token = new Token(TNUMBER, 0, 0, []);
						tokenstack.push(token);
					}
					else if ((expected & RPAREN) === 0) {
						this.error_parsing(this.pos, "unexpected \")\"");
					}

					expected = (OPERATOR | RPAREN | COMMA | LPAREN | CALL);
				}
				else if (this.isComma()) {
					if ((expected & COMMA) === 0) {
						this.error_parsing(this.pos, "unexpected \",\"");
					}
					this.addfunc(tokenstack, operstack, TOP2);
					noperators += 2;
					expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
				}
				else if (this.isConst()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing(this.pos, "unexpected constant");
					}
					var consttoken = new Token(TNUMBER, 0, 0, this.tokennumber);
					tokenstack.push(consttoken);
					expected = (OPERATOR | RPAREN | COMMA);
				}
				else if (this.isOp2()) {
					if ((expected & FUNCTION) === 0) {
						this.error_parsing(this.pos, "unexpected function");
					}
					this.addfunc(tokenstack, operstack, TOP2);
					noperators += 2;
					expected = (LPAREN);
				}
				else if (this.isOp1()) {
					if ((expected & FUNCTION) === 0) {
						this.error_parsing(this.pos, "unexpected function");
					}
					this.addfunc(tokenstack, operstack, TOP1);
					noperators++;
					expected = (LPAREN);
				}
				else if (this.isVar()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing(this.pos, "unexpected variable");
					}
					var vartoken = new Token(TVAR, this.tokenindex, 0, 0);
					tokenstack.push(vartoken);

					expected = (OPERATOR | RPAREN | COMMA | LPAREN | CALL);
				}
				else if (this.isWhite()) {
				}
				else {
					if (this.errormsg === "") {
						this.error_parsing(this.pos, "unknown character");
					}
					else {
						this.error_parsing(this.pos, this.errormsg);
					}
				}
			}
			if (this.tmpprio < 0 || this.tmpprio >= 10) {
				this.error_parsing(this.pos, "unmatched \"()\"");
			}
			while (operstack.length > 0) {
				var tmp = operstack.pop();
				tokenstack.push(tmp);
			}
			if (noperators + 1 !== tokenstack.length) {
				//print(noperators + 1);
				//print(tokenstack);
				this.error_parsing(this.pos, "parity");
			}

			return new Expression(tokenstack, object(this.ops1), object(this.ops2), object(this.functions));
		},

		evaluate: function (expr, variables) {
			return this.parse(expr).evaluate(variables);
		},

		error_parsing: function (column, msg) {
			this.success = false;
			this.errormsg = "parse error [column " + (column) + "]: " + msg;
			this.column = column;
			throw new Error(this.errormsg);
		},

//\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\

		addfunc: function (tokenstack, operstack, type_) {
			var operator = new Token(type_, this.tokenindex, this.tokenprio + this.tmpprio, 0);
			while (operstack.length > 0) {
				if (operator.prio_ <= operstack[operstack.length - 1].prio_) {
					tokenstack.push(operstack.pop());
				}
				else {
					break;
				}
			}
			operstack.push(operator);
		},

		isNumber: function () {
			var r = false;
			var str = "";
			while (this.pos < this.expression.length) {
				var code = this.expression.charCodeAt(this.pos);
				if ((code >= 48 && code <= 57) || code === 46) {
					str += this.expression.charAt(this.pos);
					this.pos++;
					this.tokennumber = parseFloat(str);
					r = true;
				}
				else {
					break;
				}
			}
			return r;
		},

		// Ported from the yajjl JSON parser at http://code.google.com/p/yajjl/
		unescape: function(v, pos) {
			var buffer = [];
			var escaping = false;

			for (var i = 0; i < v.length; i++) {
				var c = v.charAt(i);
	
				if (escaping) {
					switch (c) {
					case "'":
						buffer.push("'");
						break;
					case '\\':
						buffer.push('\\');
						break;
					case '/':
						buffer.push('/');
						break;
					case 'b':
						buffer.push('\b');
						break;
					case 'f':
						buffer.push('\f');
						break;
					case 'n':
						buffer.push('\n');
						break;
					case 'r':
						buffer.push('\r');
						break;
					case 't':
						buffer.push('\t');
						break;
					case 'u':
						// interpret the following 4 characters as the hex of the unicode code point
						var codePoint = parseInt(v.substring(i + 1, i + 5), 16);
						buffer.push(String.fromCharCode(codePoint));
						i += 4;
						break;
					default:
						throw this.error_parsing(pos + i, "Illegal escape sequence: '\\" + c + "'");
					}
					escaping = false;
				} else {
					if (c == '\\') {
						escaping = true;
					} else {
						buffer.push(c);
					}
				}
			}
	
			return buffer.join('');
		},

		isString: function () {
			var r = false;
			var str = "";
			var startpos = this.pos;
			if (this.pos < this.expression.length && this.expression.charAt(this.pos) == "'") {
				this.pos++;
				while (this.pos < this.expression.length) {
					var code = this.expression.charAt(this.pos);
					if (code != "'" || str.slice(-1) == "\\") {
						str += this.expression.charAt(this.pos);
						this.pos++;
					}
					else {
						this.pos++;
						this.tokennumber = this.unescape(str, startpos);
						r = true;
						break;
					}
				}
			}
			return r;
		},

		isConst: function () {
			var str;
			for (var i in this.consts) {
				if (true) {
					var L = i.length;
					str = this.expression.substr(this.pos, L);
					if (i === str) {
						this.tokennumber = this.consts[i];
						this.pos += L;
						return true;
					}
				}
			}
			return false;
		},

		isOperator: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 43) { // +
				this.tokenprio = 0;
				this.tokenindex = "+";
			}
			else if (code === 45) { // -
				this.tokenprio = 0;
				this.tokenindex = "-";
			}
			else if (code === 124) { // |
				if (this.expression.charCodeAt(this.pos + 1) === 124) {
					this.pos++;
					this.tokenprio = 0;
					this.tokenindex = "||";
				}
				else {
					return false;
				}
			}
			else if (code === 42 || code === 8729 || code === 8226) { // * or ∙ or •
				this.tokenprio = 1;
				this.tokenindex = "*";
			}
			else if (code === 47) { // /
				this.tokenprio = 2;
				this.tokenindex = "/";
			}
			else if (code === 37) { // %
				this.tokenprio = 2;
				this.tokenindex = "%";
			}
			else if (code === 94) { // ^
				this.tokenprio = 3;
				this.tokenindex = "^";
			}
			else {
				return false;
			}
			this.pos++;
			return true;
		},

		isSign: function () {
			var code = this.expression.charCodeAt(this.pos - 1);
			if (code === 45 || code === 43) { // -
				return true;
			}
			return false;
		},

		isPositiveSign: function () {
			var code = this.expression.charCodeAt(this.pos - 1);
			if (code === 43) { // +
				return true;
			}
			return false;
		},

		isNegativeSign: function () {
			var code = this.expression.charCodeAt(this.pos - 1);
			if (code === 45) { // -
				return true;
			}
			return false;
		},

		isLeftParenth: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 40) { // (
				this.pos++;
				this.tmpprio += 10;
				return true;
			}
			return false;
		},

		isRightParenth: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 41) { // )
				this.pos++;
				this.tmpprio -= 10;
				return true;
			}
			return false;
		},

		isComma: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 44) { // ,
				this.pos++;
				this.tokenprio = -1;
				this.tokenindex = ",";
				return true;
			}
			return false;
		},

		isWhite: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 32 || code === 9 || code === 10 || code === 13) {
				this.pos++;
				return true;
			}
			return false;
		},

		isOp1: function () {
			var str = "";
			for (var i = this.pos; i < this.expression.length; i++) {
				var c = this.expression.charAt(i);
				if (c.toUpperCase() === c.toLowerCase()) {
					if (i === this.pos || (c != '_' && (c < '0' || c > '9'))) {
						break;
					}
				}
				str += c;
			}
			if (str.length > 0 && (str in this.ops1)) {
				this.tokenindex = str;
				this.tokenprio = 5;
				this.pos += str.length;
				return true;
			}
			return false;
		},

		isOp2: function () {
			var str = "";
			for (var i = this.pos; i < this.expression.length; i++) {
				var c = this.expression.charAt(i);
				if (c.toUpperCase() === c.toLowerCase()) {
					if (i === this.pos || (c != '_' && (c < '0' || c > '9'))) {
						break;
					}
				}
				str += c;
			}
			if (str.length > 0 && (str in this.ops2)) {
				this.tokenindex = str;
				this.tokenprio = 5;
				this.pos += str.length;
				return true;
			}
			return false;
		},

		isVar: function () {
			var str = "";
			for (var i = this.pos; i < this.expression.length; i++) {
				var c = this.expression.charAt(i);
				if (c.toUpperCase() === c.toLowerCase()) {
					if (i === this.pos || (c != '_' && (c < '0' || c > '9'))) {
						break;
					}
				}
				str += c;
			}
			if (str.length > 0) {
				this.tokenindex = str;
				this.tokenprio = 4;
				this.pos += str.length;
				return true;
			}
			return false;
		},

		isComment: function () {
			var code = this.expression.charCodeAt(this.pos - 1);
			if (code === 47 && this.expression.charCodeAt(this.pos) === 42) {
				this.pos = this.expression.indexOf("*/", this.pos) + 2;
				if (this.pos === 1) {
					this.pos = this.expression.length;
				}
				return true;
			}
			return false;
		}
	};

	scope.Parser = Parser;
	return Parser
})(typeof exports === 'undefined' ? {} : exports);

function ActivityViewModel (act, site, project, metaModel, themes) {
    var self = this;
    self.activityId = act.activityId;
    self.description = ko.observable(act.description);
    self.notes = ko.observable(act.notes);
    self.startDate = ko.observable(act.startDate || act.plannedStartDate).extend({simpleDate: false});
    self.endDate = ko.observable(act.endDate || act.plannedEndDate).extend({simpleDate: false});
    self.eventPurpose = ko.observable(act.eventPurpose);
    self.fieldNotes = ko.observable(act.fieldNotes);
    self.associatedProgram = ko.observable(act.associatedProgram);
    self.associatedSubProgram = ko.observable(act.associatedSubProgram);
    self.projectStage = ko.observable(act.projectStage || "");
    self.progress = ko.observable(act.progress || 'started');
    self.mainTheme = ko.observable(act.mainTheme);
    self.type = ko.observable(act.type);
    self.siteId = ko.observable(act.siteId);
    self.projectId = act.projectId;
    self.transients = {};
    self.transients.site = site;
    self.transients.project = project;
    self.transients.metaModel = metaModel || {};
    self.transients.activityProgressValues = ['planned','started','finished'];
    self.transients.themes = $.map(themes || [], function (obj, i) { return obj.name });
    self.goToProject = function () {
        if (self.projectId) {
            document.location.href = fcConfig.projectViewUrl + self.projectId;
        }
    };
    self.goToSite = function () {
        if (self.siteId()) {
            document.location.href = fcConfig.siteViewUrl + self.siteId();
        }
    };
    if (metaModel.supportsPhotoPoints) {
        self.transients.photoPointModel = ko.observable(new PhotoPointViewModel(site, act));
    }
}

var PhotoPointViewModel = function(site, activity, config) {

    var self = this;

    var defaults = {
        savePhotoPointUrl: fcConfig.savePhotoPointUrl,
        deletePhotoPointUrl: fcConfig.deletePhotoPointUrl,
        newPhotoPointModalSelector: '#edit-photopoint',
        newPhotoPointMapHolderSelector: '#photoPointMapHolder',
        activityMapHolderSelector: '#map-holder',
        mapSelector: '#smallMap'
    };
    var options = $.extend(defaults, config);


    self.site = site;
    self.photoPoints = ko.observableArray();

    if (site && site.poi) {

        $.each(site.poi, function(index, obj) {
            var photos = ko.utils.arrayFilter(activity.documents, function(doc) {
                return doc.siteId === site.siteId && doc.poiId === obj.poiId;
            });
            self.photoPoints.push(photoPointPhotos(site, obj, activity.activityId, photos, config));
        });
    }

    self.removePhotoPoint = function(photoPoint) {

        $.ajax({
            url: options.deletePhotoPointUrl+'/'+site.siteId+'?poiId='+photoPoint.photoPoint.poiId,
            method: "POST"
        }).done(function(data) {
            if (!data ||  data.error) {
                bootbox.alert("Failed to delete the Photo Point.");
            }
            else {
                self.photoPoints.remove(photoPoint);
            }
        }).fail(function() {
            bootbox.alert("Failed to delete the Photo Point.");
        });

    };

    self.editPhotoPoint = function(photoPointWithPhotos) {
        self.addOrEditPhotoPoint(photoPointWithPhotos, photoPointWithPhotos.photoPoint.modelForSaving());
    };

    self.addPhotoPoint = function() {
        self.addOrEditPhotoPoint(null);
    };

    self.addOrEditPhotoPoint = function(photoPointWithPhotos, photoPointData, successCallback) {
        var map = alaMap.map;
        var originalBounds = map.getBounds();
        $(options.newPhotoPointModalSelector).modal('show').on('shown', function() {
            // "Borrow" the map display from the top of the page as it is already displaying the site / zoomed etc.
            $(options.newPhotoPointMapHolderSelector).append($(options.mapSelector));
            google.maps.event.trigger(map, "resize");

        }).validationEngine('attach', {scroll:false});

        var model = new EditPhotoPointViewModel(photoPointData, map, !photoPointWithPhotos);

        var cleanup = function() {
            model.cleanup();

            // Return the map to the top of the page.
            $(options.activityMapHolderSelector).append($(options.mapSelector));
            google.maps.event.trigger(map, "resize");
            map.fitBounds(originalBounds);
            $(options.newPhotoPointModalSelector).modal('hide');
            ko.cleanNode($(options.newPhotoPointModalSelector)[0]);

        };
        model.save = function() {
            var valid = $(options.newPhotoPointModalSelector).validationEngine("validate");

            if (valid) {
                var jsData = model.photoPoint.modelForSaving();
                var json = JSON.stringify(jsData);
                var url = options.savePhotoPointUrl+'/'+site.siteId;
                $.ajax({
                    url: url,
                    data: json,
                    method: "POST",
                    contentType: "application/json"
                }).done(function(data) {
                    if (!data || !data.resp || data.resp.error) {
                        bootbox.alert("Failed to save Photo Point!");
                    }
                    else {
                        if (!photoPointWithPhotos) {
                            jsData.poiId = data.resp.poiId;
                            photoPointWithPhotos = photoPointPhotos(site, jsData, activity.activityId, [], config, !photoPointWithPhotos);
                            self.photoPoints.push(photoPointWithPhotos);
                        }
                        else {
                            photoPointWithPhotos.photoPoint.update(jsData);
                        }
                        cleanup();
                        if (successCallback) {
                            successCallback(photoPointWithPhotos);
                        }
                    }

                }).fail(function() {
                    bootbox.alert("Failed to save Photo Point!");
                });
            }
        };
        model.cancel = function() {
            cleanup();
        };
        ko.applyBindings(model, $(options.newPhotoPointModalSelector)[0]);
    };

    var newPhotoPointPhotoHolder = ko.observableArray();
    newPhotoPointPhotoHolder.subscribe(function(photos) {
        if (!photos[0]) {
            return;
        }
        var data = photos[0];

        if (data.decimalLatitude && data.decimalLongitude) {
            self.addOrEditPhotoPoint(null, {
                name: '',
                description:'',
                geometry: {
                    decimalLatitude: data.decimalLatitude,
                    decimalLongitude  : data.decimalLongitude,
                    bearing : data.decimalBearing
                }
            }, function(newPhotoPointModel) {
                newPhotoPointModel.files(photos);
            });
        }
        else {
            bootbox.alert("We couldn't find GPS information in the supplied photo.  The photo point coordinates will default to the site centre.", function() {
                self.addOrEditPhotoPoint(null, null, function(newPhotoPointModel) {
                    newPhotoPointModel.files(photos);
                });
            });
        }
        newPhotoPointPhotoHolder([]);
    });
    self.newPhotoPointFromPhotoUploadConfig = {
        url: (config && config.imageUploadUrl) || fcConfig.imageUploadUrl,
        target: newPhotoPointPhotoHolder
    };

    self.modelForSaving = function() {
        var siteId = site?site.siteId:'';
        var toSave = {siteId:siteId, photos:[], photoPoints:[]};

        $.each(self.photoPoints(), function(i, photoPoint) {
            $.each(photoPoint.photos(), function(i, photo) {
                toSave.photos.push(photo.modelForSaving());
            });
        });
        return toSave;
    };

    // Simulate the behaviour of the dirty flag manually.
    self.dirtyFlag = {
        isDirty:ko.computed(function() {
            var dirty = false;
            $.each(self.photoPoints(), function(i, photo) {
                dirty = dirty || photo.dirtyFlag.isDirty();
            });
            return dirty;
        }),
        reset:function() {
            $.each(self.photoPoints(), function(i, photo) {
                photo.dirtyFlag.reset();
            });
        }
    };
};

var photoPointPOI = function(data) {
    if (!data) {
        data = {
            geometry:{}
        };
    }
    var name = ko.observable(data.name);
    var description = ko.observable(data.description);
    var lat = ko.observable(data.geometry.decimalLatitude);
    var lng = ko.observable(data.geometry.decimalLongitude);
    var bearing = ko.observable(data.geometry.bearing);

    var update = function(data) {
        name(data.name);
        description(data.description);
        lat(data.geometry.decimalLatitude);
        lng(data.geometry.decimalLongitude);
        bearing(data.geometry.bearing);

    };
    var modelForSaving = function() {
        return ko.toJS(returnValue);
    };

    var returnValue = {
        poiId:data.poiId,
        name:name,
        description:description,
        geometry:{
            type:'Point',
            decimalLatitude:lat,
            decimalLongitude:lng,
            bearing:bearing,
            coordinates:[lng, lat]
        },
        type:'photopoint',
        modelForSaving:modelForSaving,
        update:update
    };
    return returnValue;
};

var EditPhotoPointViewModel = function(photopoint, map, isNew) {
    var self = this;
    self.photoPoint = photoPointPOI(photopoint);
    self.title = isNew ? "New Photo Point" : "Edit Photo Point";
    self.newOrEditText = isNew ? "created" : "edited";
    self.newOrEditText2 = isNew ? "" : "the edits";

    var lat = map.center.lat();
    var lng = map.center.lng();


    if (self.photoPoint.geometry.decimalLatitude()) {
        lat = self.photoPoint.geometry.decimalLatitude();
    }
    else {
        self.photoPoint.geometry.decimalLatitude(lat);
    }
    if (self.photoPoint.geometry.decimalLongitude()) {
        lng = self.photoPoint.geometry.decimalLongitude();
    }
    else {
        self.photoPoint.geometry.decimalLongitude(lng);
    }

    var bounds = new google.maps.LatLngBounds();
    bounds.union(map.getBounds());

    var markerPos = new google.maps.LatLng(lat,lng);
    var marker = new google.maps.Marker({
        position: markerPos,
        draggable:true,
        map:map
    });
    bounds = bounds.extend(markerPos);

    map.fitBounds(bounds);

    self.cleanup = function() {
        marker.setMap(null);
    };

    marker.setIcon('https://maps.google.com/mapfiles/marker_yellow.png');

    google.maps.event.addListener(
        marker,
        'dragend',
        function(event) {
            self.photoPoint.geometry.decimalLatitude(event.latLng.lat());
            self.photoPoint.geometry.decimalLongitude(event.latLng.lng());
        }
    );

};

var photoPointPhotos = function(site, photoPoint, activityId, existingPhotos, config, isNew) {

    var files = ko.observableArray();
    var photos = ko.observableArray();
    var photoPoint = photoPointPOI(photoPoint);

    $.each(existingPhotos, function(i, photo) {
        photos.push(photoPointPhoto(photo));
    });

    files.subscribe(function(newValue) {
        var f = newValue.splice(0, newValue.length);
        for (var i=0; i<f.length; i++) {

            var data = {
                thumbnailUrl:f[i].thumbnail_url,
                url:f[i].url,
                contentType:f[i].contentType,
                filename:f[i].name,
                filesize:f[i].size,
                dateTaken:f[i].isoDate,
                lat:f[i].decimalLatitude,
                lng:f[i].decimalLongitude,
                poiId:photoPoint.poiId,
                siteId:site.siteId,
                activityId:activityId,
                name:site.name+' - '+photoPoint.name(),
                type:'image'


            };

            if (isNew && data.lat && data.lng && !photoPoint.geometry.decimalLatitude() && !photoPoint.geometry.decimalLongitude()) {
                photoPoint.geometry.decimalLatitude(data.lat);
                photoPoint.geometry.decimalLongitude(data.lng);
            }

            photos.push(photoPointPhoto(data));
        }
    });


    return {
        photoPoint:photoPoint,
        photos:photos,
        files:files,

        uploadConfig : {
            url: (config && config.imageUploadUrl) || fcConfig.imageUploadUrl,
            target: files
        },
        removePhoto : function (photo) {
            if (photo.documentId) {
                photo.status('deleted');
            }
            else {
                photos.remove(photo);
            }
        },
        template : function(photoPoint) {
            return isNew ? 'editablePhotoPoint' : 'readOnlyPhotoPoint'
        },
        isNew : function() { return isNew },
        dirtyFlag: {
            isDirty: ko.computed(function() {
                var tmpPhotos = photos();
                for (var i=0; i<tmpPhotos.length; i++) {
                    if (tmpPhotos[i].dirtyFlag.isDirty()) {
                        return true;
                    }
                }
                return false;
            }),
            reset: function() {
                var tmpPhotos = photos();
                for (var i=0; i<tmpPhotos.length; i++) {
                    tmpPhotos[i].dirtyFlag.reset();
                }
            }
        }

    }
};

var photoPointPhoto = function(data) {
    if (!data) {
        data = {};
    }
    data.role = 'photoPoint';
    var result = new DocumentViewModel(data);
    result.dateTaken = ko.observable(data.dateTaken).extend({simpleDate:false});
    result.formattedSize = formatBytes(data.filesize);

    for (var prop in data) {
        if (!result.hasOwnProperty(prop)) {
            result[prop]= data[prop];
        }
    }
    var docModelForSaving = result.modelForSaving;
    result.modelForSaving = function() {
        var js = docModelForSaving();
        delete js.lat;
        delete js.lng;
        delete js.thumbnailUrl;
        delete js.formattedSize;

        return js;
    };
    result.dirtyFlag = ko.dirtyFlag(result, false);

    return result;
};
function sortActivities(activities) {
    activities.sort(function (a,b) {

        if (a.stageOrder !== undefined && b.stageOrder !== undefined && a.stageOrder != b.stageOrder) {
            return a.stageOrder - b.stageOrder;
        }
        if (a.sequence !== undefined && b.sequence !== undefined) {
            return a.sequence - b.sequence;
        }

        if (a.plannedStartDate != b.plannedStartDate) {
            return a.plannedStartDate < b.plannedStartDate ? -1 : (a.plannedStartDate > b.plannedStartDate ? 1 : 0);
        }
        var numericActivity = /[Aa]ctivity (\d+)(\w)?.*/;
        var first = numericActivity.exec(a.description);
        var second = numericActivity.exec(b.description);
        if (first && second) {
            var firstNum = Number(first[1]);
            var secondNum = Number(second[1]);
            if (firstNum == secondNum) {
                // This is to catch activities of the form Activity 1a, Activity 1b etc.
                if (first.length == 3 && second.length == 3) {
                    return first[2] > second[2] ? 1 : (first[2] < second[2] ? -1 : 0);
                }
            }
            return  firstNum - secondNum;
        }
        else {
            if (a.dateCreated !== undefined && b.dateCreated !== undefined && a.dateCreated != b.dateCreated) {
                return a.dateCreated < b.dateCreated ? 1 : -1;
            }
            return a.description > b.description ? 1 : (a.description < b.description ? -1 : 0);
        }

    });
}

var ActivityNavigationViewModel = function(projectId, activityId, config) {
    var self = this;
    self.activities = ko.observableArray();

    self.stages = ko.observableArray();
    self.selectedStage = ko.observable();
    self.selectedActivity = ko.observable();
    self.stageActivities = ko.observableArray();

    self.selectedStage.subscribe(function (newStage) {
        self.stageActivities( _.filter(self.activities(), function (activity) { return activity.stage == newStage  }));
        self.selectedActivity(self.nextActivity());
    });
    self.hasNext = function() {
        return self.nextActivity().activityId !== undefined;
    };
    self.hasPrevious = function() {
        return self.previousActivity().activityId !== undefined;
    };
    self.nextActivityUrl = function() {
        if (self.hasNext()) {
            return config.activityUrl + '/' + self.nextActivity().activityId + (config.returnTo ? '?returnTo=' + encodeURIComponent(config.returnTo) : '');
        }
        return '#';

    };
    self.previousActivityUrl = function() {
        if (self.hasPrevious()) {
            return config.activityUrl + '/' + self.previousActivity().activityId + (config.returnTo ? '?returnTo=' + encodeURIComponent(config.returnTo) : '');
        }
        return '#';

    };
    self.nextActivity = function() {
        return self.activities()[currentActivityIndex()+1] || {};
    };
    self.previousActivity = function() {
        return self.activities()[currentActivityIndex()-1] || {};
    };

    self.navigateUrl = ko.computed(function() {
        if (self.selectedActivity()) {
            return config.activityUrl + '/' +self.selectedActivity().activityId + (config.returnTo ? '?returnTo=' + encodeURIComponent(config.returnTo) : '');
        }
        return '#';

    });

    self.returnUrl = config.returnTo;

    function currentActivityIndex() {
        return _.findIndex(self.activities(), function (activity) {
           return activity.activityId == activityId;
        });
    }

    self.activities.subscribe(function(activities) {

        self.stages(_.uniq(_.pluck(activities, 'stage')));

        if (self.hasNext()) {
            var next = self.nextActivity();
            self.selectedStage(next.stage);
        }

    });

    $.get(config.navigationUrl).done(function (activities) {
        sortActivities(activities);
        self.activities(activities);
    });
};
/*!
 * AmplifyJS 1.1.0 - Core, Store, Request
 * 
 * Copyright 2011 appendTo LLC. (http://appendto.com/team)
 * Dual licensed under the MIT or GPL licenses.
 * http://appendto.com/open-source-licenses
 * 
 * http://amplifyjs.com
 */
(function(a,b){var c=[].slice,d={},e=a.amplify={publish:function(a){var b=c.call(arguments,1),e,f,g,h=0,i;if(!d[a])return!0;e=d[a].slice();for(g=e.length;h<g;h++){f=e[h],i=f.callback.apply(f.context,b);if(i===!1)break}return i!==!1},subscribe:function(a,b,c,e){arguments.length===3&&typeof c=="number"&&(e=c,c=b,b=null),arguments.length===2&&(c=b,b=null),e=e||10;var f=0,g=a.split(/\s/),h=g.length,i;for(;f<h;f++){a=g[f],i=!1,d[a]||(d[a]=[]);var j=d[a].length-1,k={callback:c,context:b,priority:e};for(;j>=0;j--)if(d[a][j].priority<=e){d[a].splice(j+1,0,k),i=!0;break}i||d[a].unshift(k)}return c},unsubscribe:function(a,b){if(!!d[a]){var c=d[a].length,e=0;for(;e<c;e++)if(d[a][e].callback===b){d[a].splice(e,1);break}}}}})(this),function(a,b){function e(a,e){c.addType(a,function(f,g,h){var i,j,k,l,m=g,n=(new Date).getTime();if(!f){m={},l=[],k=0;try{f=e.length;while(f=e.key(k++))d.test(f)&&(j=JSON.parse(e.getItem(f)),j.expires&&j.expires<=n?l.push(f):m[f.replace(d,"")]=j.data);while(f=l.pop())e.removeItem(f)}catch(o){}return m}f="__amplify__"+f;if(g===b){i=e.getItem(f),j=i?JSON.parse(i):{expires:-1};if(j.expires&&j.expires<=n)e.removeItem(f);else return j.data}else if(g===null)e.removeItem(f);else{j=JSON.stringify({data:g,expires:h.expires?n+h.expires:null});try{e.setItem(f,j)}catch(o){c[a]();try{e.setItem(f,j)}catch(o){throw c.error()}}}return m})}var c=a.store=function(a,b,d,e){var e=c.type;d&&d.type&&d.type in c.types&&(e=d.type);return c.types[e](a,b,d||{})};c.types={},c.type=null,c.addType=function(a,b){c.type||(c.type=a),c.types[a]=b,c[a]=function(b,d,e){e=e||{},e.type=a;return c(b,d,e)}},c.error=function(){return"amplify.store quota exceeded"};var d=/^__amplify__/;for(var f in{localStorage:1,sessionStorage:1})try{window[f].getItem&&e(f,window[f])}catch(g){}if(window.globalStorage)try{e("globalStorage",window.globalStorage[window.location.hostname]),c.type==="sessionStorage"&&(c.type="globalStorage")}catch(g){}(function(){if(!c.types.localStorage){var a=document.createElement("div"),d="amplify";a.style.display="none",document.getElementsByTagName("head")[0].appendChild(a);try{a.addBehavior("#default#userdata"),a.load(d)}catch(e){a.parentNode.removeChild(a);return}c.addType("userData",function(e,f,g){a.load(d);var h,i,j,k,l,m=f,n=(new Date).getTime();if(!e){m={},l=[],k=0;while(h=a.XMLDocument.documentElement.attributes[k++])i=JSON.parse(h.value),i.expires&&i.expires<=n?l.push(h.name):m[h.name]=i.data;while(e=l.pop())a.removeAttribute(e);a.save(d);return m}e=e.replace(/[^-._0-9A-Za-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u37f-\u1fff\u200c-\u200d\u203f\u2040\u2070-\u218f]/g,"-");if(f===b){h=a.getAttribute(e),i=h?JSON.parse(h):{expires:-1};if(i.expires&&i.expires<=n)a.removeAttribute(e);else return i.data}else f===null?a.removeAttribute(e):(j=a.getAttribute(e),i=JSON.stringify({data:f,expires:g.expires?n+g.expires:null}),a.setAttribute(e,i));try{a.save(d)}catch(o){j===null?a.removeAttribute(e):a.setAttribute(e,j),c.userData();try{a.setAttribute(e,i),a.save(d)}catch(o){j===null?a.removeAttribute(e):a.setAttribute(e,j);throw c.error()}}return m})}})(),function(){function e(a){return a===b?b:JSON.parse(JSON.stringify(a))}var a={},d={};c.addType("memory",function(c,f,g){if(!c)return e(a);if(f===b)return e(a[c]);d[c]&&(clearTimeout(d[c]),delete d[c]);if(f===null){delete a[c];return null}a[c]=f,g.expires&&(d[c]=setTimeout(function(){delete a[c],delete d[c]},g.expires));return f})}()}(this.amplify=this.amplify||{}),function(a,b){function e(a){var b=!1;setTimeout(function(){b=!0},1);return function(){var c=this,d=arguments;b?a.apply(c,d):setTimeout(function(){a.apply(c,d)},1)}}function d(a){return{}.toString.call(a)==="[object Function]"}function c(){}a.request=function(b,f,g){var h=b||{};typeof h=="string"&&(d(f)&&(g=f,f={}),h={resourceId:b,data:f||{},success:g});var i={abort:c},j=a.request.resources[h.resourceId],k=h.success||c,l=h.error||c;h.success=e(function(b,c){c=c||"success",a.publish("request.success",h,b,c),a.publish("request.complete",h,b,c),k(b,c)}),h.error=e(function(b,c){c=c||"error",a.publish("request.error",h,b,c),a.publish("request.complete",h,b,c),l(b,c)});if(!j){if(!h.resourceId)throw"amplify.request: no resourceId provided";throw"amplify.request: unknown resourceId: "+h.resourceId}if(!a.publish("request.before",h))h.error(null,"abort");else{a.request.resources[h.resourceId](h,i);return i}},a.request.types={},a.request.resources={},a.request.define=function(b,c,d){if(typeof c=="string"){if(!(c in a.request.types))throw"amplify.request.define: unknown type: "+c;d.resourceId=b,a.request.resources[b]=a.request.types[c](d)}else a.request.resources[b]=c}}(amplify),function(a,b,c){var d=["status","statusText","responseText","responseXML","readyState"],e=/\{([^\}]+)\}/g;a.request.types.ajax=function(e){e=b.extend({type:"GET"},e);return function(f,g){function n(a,e){b.each(d,function(a,b){try{m[b]=h[b]}catch(c){}}),/OK$/.test(m.statusText)&&(m.statusText="success"),a===c&&(a=null),l&&(e="abort"),/timeout|error|abort/.test(e)?m.error(a,e):m.success(a,e),n=b.noop}var h,i=e.url,j=g.abort,k=b.extend(!0,{},e,{data:f.data}),l=!1,m={readyState:0,setRequestHeader:function(a,b){return h.setRequestHeader(a,b)},getAllResponseHeaders:function(){return h.getAllResponseHeaders()},getResponseHeader:function(a){return h.getResponseHeader(a)},overrideMimeType:function(a){return h.overrideMideType(a)},abort:function(){l=!0;try{h.abort()}catch(a){}n(null,"abort")},success:function(a,b){f.success(a,b)},error:function(a,b){f.error(a,b)}};a.publish("request.ajax.preprocess",e,f,k,m),b.extend(k,{success:function(a,b){n(a,b)},error:function(a,b){n(null,b)},beforeSend:function(b,c){h=b,k=c;var d=e.beforeSend?e.beforeSend.call(this,m,k):!0;return d&&a.publish("request.before.ajax",e,f,k,m)}}),b.ajax(k),g.abort=function(){m.abort(),j.call(this)}}},a.subscribe("request.ajax.preprocess",function(a,c,d){var f=[],g=d.data;typeof g!="string"&&(g=b.extend(!0,{},a.data,g),d.url=d.url.replace(e,function(a,b){if(b in g){f.push(b);return g[b]}}),b.each(f,function(a,b){delete g[b]}),d.data=g)}),a.subscribe("request.ajax.preprocess",function(a,c,d){var e=d.data,f=a.dataMap;!!f&&typeof e!="string"&&(b.isFunction(f)?d.data=f(e):(b.each(a.dataMap,function(a,b){a in e&&(e[b]=e[a],delete e[a])}),d.data=e))});var f=a.request.cache={_key:function(a,b,c){function g(){return c.charCodeAt(e++)<<24|c.charCodeAt(e++)<<16|c.charCodeAt(e++)<<8|c.charCodeAt(e++)<<0}c=b+c;var d=c.length,e=0,f=g();while(e<d)f^=g();return"request-"+a+"-"+f},_default:function(){var a={};return function(b,c,d,e){var g=f._key(c.resourceId,d.url,d.data),h=b.cache;if(g in a){e.success(a[g]);return!1}var i=e.success;e.success=function(b){a[g]=b,typeof h=="number"&&setTimeout(function(){delete a[g]},h),i.apply(this,arguments)}}}()};a.store&&(b.each(a.store.types,function(b){f[b]=function(c,d,e,g){var h=f._key(d.resourceId,e.url,e.data),i=a.store[b](h);if(i){e.success(i);return!1}var j=g.success;g.success=function(d){a.store[b](h,d,{expires:c.cache.expires}),j.apply(this,arguments)}}}),f.persist=f[a.store.type]),a.subscribe("request.before.ajax",function(a){var b=a.cache;if(b){b=b.type||b;return f[b in f?b:"_default"].apply(this,arguments)}}),a.request.decoders={jsend:function(a,b,c,d,e){a.status==="success"?d(a.data):a.status==="fail"?e(a.data,"fail"):a.status==="error"&&(delete a.status,e(a,"error"))}},a.subscribe("request.before.ajax",function(c,d,e,f){function k(a,b){h(a,b)}function j(a,b){g(a,b)}var g=f.success,h=f.error,i=b.isFunction(c.decoder)?c.decoder:c.decoder in a.request.decoders?a.request.decoders[c.decoder]:a.request.decoders._default;!i||(f.success=function(a,b){i(a,b,f,j,k)},f.error=function(a,b){i(a,b,f,j,k)})})}(amplify,jQuery);

/**
 * A view model to capture metadata about a document and manage progress / feedback as a file is uploaded.
 *
 * NOTE that we are attempting to use this same model for document records that have an associated file
 * and those that do not (eg deferral reason docs). The mechanisms for handling these two types (esp saving)
 * are not well integrated at this point.
 *
 * @param doc any existing details of the document.
 * @param owner an object containing key and value properties identifying the owning entity for the document. eg. {key:'projectId', value:'the_id_of_the_owning_project'}
 * @constructor
 */
function DocumentViewModel (doc, owner, settings) {
    var self = this;

    var defaults = {
        //Information is the default option.
        roles:  [{id: 'information', name: 'Information'}, {id:'embeddedVideo', name:'Embedded Video'}, {id: 'programmeLogic', name: 'Programme Logic'}],
        stages:[],
        showSettings: true,
        thirdPartyDeclarationTextSelector:'#thirdPartyDeclarationText',
        imageLocation: fcConfig.imageLocation
    };
    this.settings = $.extend({}, defaults, settings);

    //Associate project document to stages.
    this.maxStages = doc.maxStages;
    for(i = 0; i < this.maxStages; i++){
        this.settings.stages.push((i+1))
    }
    this.stage = ko.observable(doc ? doc.stage : 0);
    this.stages = this.settings.stages;

    // NOTE that attaching a file is optional, ie you can have a document record without a physical file
    this.filename = ko.observable(doc ? doc.filename : '');
    this.filesize = ko.observable(doc ? doc.filesize : '');
    this.name = ko.observable(doc.name);
    // the notes field can be used as a pseudo-document (eg a deferral reason) or just for additional metadata
    this.notes = ko.observable(doc.notes);
    this.filetypeImg = function () {
        return self.settings.imageLocation + '/filetypes/' + iconnameFromFilename(self.filename());
    };
    this.iconImgUrl = function() {
        if (self.type == 'image' || (self.contentType() && self.contentType().indexOf('image') == 0)) {
            return self.thumbnailUrl;
        }
        return self.filetypeImg();
    };
    this.uploadDate = ko.observable(doc.lastUpdated).extend({simpleDate:false});
    this.status = ko.observable(doc.status || 'active');
    this.attribution = ko.observable(doc ? doc.attribution : '');
    this.license = ko.observable(doc ? doc.license : '');
    this.type = ko.observable(doc.type);
    this.role = ko.observable(doc.role);
    this.roles = this.settings.roles;
    this.public = ko.observable(doc.public);
    this.url = doc.url;
    this.thumbnailUrl = doc.thumbnailUrl ? doc.thumbnailUrl : doc.url;
    this.documentId = doc.documentId;
    this.hasPreview = ko.observable(false);
    this.error = ko.observable();
    this.progress = ko.observable(0);
    this.complete = ko.observable(false);
    this.readOnly = doc && doc.readOnly ? doc.readOnly : false;
    this.contentType = ko.observable(doc ? doc.contentType : 'application/octet-stream');
    this.fileButtonText = ko.computed(function() {
        return (self.filename() ? "Change file" : "Attach file");
    });
    this.onRoleChange = function(val) {
        if(this.role() == 'programmeLogic'){
            this.public(false);
            this.isPrimaryProjectImage(false);
        }
    };

    this.isPrimaryProjectImage = ko.observable(doc.isPrimaryProjectImage);
    this.thirdPartyConsentDeclarationMade = ko.observable(doc.thirdPartyConsentDeclarationMade);
    this.thirdPartyConsentDeclarationText = null;
    this.embeddedVideo = ko.observable(doc.embeddedVideo);
    this.embeddedVideoVisible = ko.computed(function() {
        return (self.role() == 'embeddedVideo');
    });
    this.externalUrl = ko.observable(doc.externalUrl);
    this.labels = ko.observableArray(doc.labels || []);
    this.thirdPartyConsentDeclarationMade.subscribe(function(declarationMade) {
        // Record the text that the user agreed to (as it is an editable setting).
        if (declarationMade) {
            self.thirdPartyConsentDeclarationText = $(self.settings.thirdPartyDeclarationTextSelector).text();
        }
        else {
            self.thirdPartyConsentDeclarationText = null;
        }
        $("#thirdPartyConsentCheckbox").closest('form').validationEngine("updatePromptsPosition")
    });
    this.thirdPartyConsentDeclarationRequired = ko.computed(function() {
        return (self.type() == 'image' ||  self.role() == 'embeddedVideo')  && self.public();
    });
    this.thirdPartyConsentDeclarationRequired.subscribe(function(newValue) {
        if (newValue) {
            setTimeout(function() {$("#thirdPartyConsentCheckbox").validationEngine('validate');}, 100);
        }
    });
    this.fileReady = ko.computed(function() {
        return self.filename() && self.progress() === 0 && !self.error();
    });
    this.saveEnabled = ko.computed(function() {
        if (self.thirdPartyConsentDeclarationRequired() && !self.thirdPartyConsentDeclarationMade()) {
            return false;
        }
        else if(self.role() == 'embeddedVideo'){
            return buildiFrame(self.embeddedVideo()) != "" ;
        }

        return self.fileReady();
    });
    this.saveHelp = ko.computed(function() {
        if(self.role() == 'embeddedVideo' && !buildiFrame(self.embeddedVideo())){
            return 'Invalid embed video code';
        }
        else if(self.role() == 'embeddedVideo' && !self.saveEnabled()){
            return 'You must accept the Privacy Declaration before an embed video can be made viewable by everyone';
        }
        else if (!self.fileReady()) {
            return 'Attach a file using the "+ Attach file" button';
        }
        else if (!self.saveEnabled()) {
            return 'You must accept the Privacy Declaration before an image can be made viewable by everyone';
        }
        return '';
    });
    // make this support both the old key/value syntax and any set of props so we can define more than
    // one owner attribute
    if (owner !== undefined) {
        if (owner.key !== undefined) {
            self[owner.key] = owner.value;
        }
        for (var propName in owner) {
            if (owner.hasOwnProperty(propName) && propName !== 'key' && propName !== 'value') {
                self[propName] = owner[propName];
            }
        }
    }

    /**
     * Detaches an attached file and resets associated fields.
     */
    this.removeFile = function() {
        self.filename('');
        self.filesize('');
        self.hasPreview(false);
        self.error('');
        self.progress(0);
        self.complete(false);
        self.file = null;
    };
    // Callbacks from the file upload widget, these are attached manually (as opposed to a knockout binding).
    this.fileAttached = function(file) {
        self.filename(file.name);
        self.filesize(file.size);
        // Should be use just the mime type or include the mime type as well?
        if (file.type) {
            var type = file.type.split('/');
            if (type) {
                self.type(type[0]);
            }
        }
        else if (file.name) {

            var type = file.name.split('.').pop();

            var imageTypes = ['gif','jpeg', 'jpg', 'png', 'tif', 'tiff'];
            if ($.inArray(type.toLowerCase(), imageTypes) > -1) {
                self.type('image');
            }
            else {
                self.type('document');
            }
        }
    };
    this.filePreviewAvailable = function(file) {
        this.hasPreview(true);
    };
    this.uploadProgress = function(uploaded, total) {
        var progress = Math.round(uploaded/total*100);
        self.progress(progress);
    };
    this.fileUploaded = function(file) {
        self.complete(true);
        self.url = file.url;
        self.documentId = file.documentId;
        self.progress(100);
        setTimeout(self.close, 1000);
    };
    this.fileUploadFailed = function(error) {
        this.error(error);
    };

    /** Formatting function for the file name and file size */
    this.fileLabel = ko.computed(function() {
        var label = self.filename();
        if (self.filesize()) {
            label += ' ('+formatBytes(self.filesize())+')';
        }
        return label;
    });

    // This save method does not handle file uploads - it just deals with saving the doc record
    // - see below for the file upload save
    this.recordOnlySave = function (uploadUrl) {
        $.post(
            uploadUrl,
            {document:self.toJSONString()},
            function(result) {
                self.complete(true); // ??
                self.documentId = result.documentId;
            })
            .fail(function() {
                self.error('Error saving document record');
            });
    };

    this.toJSONString = function() {
        // These are not properties of the document object, just used by the view model.
        return JSON.stringify(self.modelForSaving());
    };

    this.modelForSaving = function() {
        return ko.mapping.toJS(self, {'ignore':['embeddedVideoVisible','iframe','helper', 'progress', 'hasPreview', 'error', 'fileLabel', 'file', 'complete', 'fileButtonText', 'roles', 'stages','maxStages', 'settings', 'thirdPartyConsentDeclarationRequired', 'saveEnabled', 'saveHelp', 'fileReady']});
    };

}


/**
 * Attaches the jquery.fileupload plugin to the element identified by the uiSelector parameter and
 * configures the callbacks to the appropriate methods of the supplied documentViewModel.
 * @param uploadUrl the URL to upload the document to.
 * @param documentViewModel The view model to attach to the file upload.
 * @param uiSelector the ui element to bind the file upload functionality to.
 * @param previewElementSelector selector for a ui element to attach an image preview when it is generated.
 */
function attachViewModelToFileUpload(uploadUrl, documentViewModel, uiSelector, previewElementSelector) {

    var fileUploadHelper;

    $(uiSelector).fileupload({
        url:uploadUrl,
        formData:function(form) {return [{name:'document', value:documentViewModel.toJSONString()}]},
        autoUpload:false,
        forceIframeTransport: true,
        getFilesFromResponse: function(data) { // This is to support file upload on pages that include the fileupload-ui which expects a return value containing an array of files.
            return data;
        }
    }).on('fileuploadadd', function(e, data) {

        fileUploadHelper = data;
        documentViewModel.fileAttached(data.files[0]);
    }).on('fileuploadprocessalways', function(e, data) {
        if (data.files[0].preview) {
            documentViewModel.filePreviewAvailable(data.files[0]);
            if (previewElementSelector !== undefined) {
                $(uiSelector).find(previewElementSelector).append(data.files[0].preview);
            }

        }
    }).on('fileuploadprogressall', function(e, data) {
        documentViewModel.uploadProgress(data.loaded, data.total);
    }).on('fileuploaddone', function(e, data) {

        var result;

        // Because of the iframe upload, the result will be returned as a query object wrapping a document containing
        // the text in a <pre></pre> block.  If the fileupload-ui script is included, the data will be extracted
        // before this callback is invoked, thus the check.*
        if (data.result instanceof jQuery) {
            var resultText = $('pre', data.result).text();
            result = JSON.parse(resultText);
        }
        else {
            result = data.result;
        }

        if (!result) {
            result = {};
            result.error = 'No response from server';
        }

        if (result.documentId) {
            documentViewModel.fileUploaded(result);
        }
        else {
            documentViewModel.fileUploadFailed(result.error);
        }

    }).on('fileuploadfail', function(e, data) {
        documentViewModel.fileUploadFailed(data.errorThrown);
    });



    // We are keeping the reference to the helper here rather than the view model as it doesn't serialize correctly
    // (i.e. calls to toJSON fail).
    documentViewModel.save = function() {
        var result = $(uiSelector).find('form').validationEngine("validate");
        if (result) {


            if (documentViewModel.filename() && fileUploadHelper !== undefined) {
                fileUploadHelper.submit();
                fileUploadHelper = null;
            }
            else {
                // There is no file attachment but we can save the document anyway.
                $.post(
                    uploadUrl,
                    {document: documentViewModel.toJSONString()},
                    function (result) {
                        var resp = JSON.parse(result).resp;
                        documentViewModel.fileUploaded(resp);
                    })
                    .fail(function () {
                        documentViewModel.fileUploadFailed('Error uploading document');
                    });
            }
        }
    }
}


/**
 * Creates a bootstrap modal from the supplied UI element to collect and upload a document and returns a
 * jquery Deferred promise to provide access to the uploaded Document.
 * @param uploadUrl the URL to upload the document to.
 * @param documentViewModel default model for the document.  can be used to populate role, etc.
 * @param modalSelector a selector identifying the ui element that contains the markup for the bootstrap modal dialog.
 * @param fileUploadSelector a selector identifying the ui element to attach the file upload functionality to.
 * @param previewSelector a selector identifying an element to attach a preview of the file to (optional)
 * @returns an instance of jQuery.Deferred - the uploaded document will be supplied to a chained 'done' function.
 */
function showDocumentAttachInModal(uploadUrl, documentViewModel, modalSelector, fileUploadSelector, previewSelector) {

    if (fileUploadSelector === undefined) {
        fileUploadSelector = '#attachDocument';
    }
    if (previewSelector === undefined) {
        previewSelector = '#preview';
    }
    var $fileUpload = $(fileUploadSelector);
    var $modal = $(modalSelector);
    //var documentViewModel = new DocumentViewModel(document?document:{}, owner);

    attachViewModelToFileUpload(uploadUrl, documentViewModel, fileUploadSelector, previewSelector);

    // Used to communicate the result back to the calling process.
    var result = $.Deferred();

    // Decorate the model so it can handle the button presses and close the modal window.
    documentViewModel.cancel = function() {
        result.reject();
        closeModal();
    };
    documentViewModel.close = function() {
        result.resolve(ko.toJS(documentViewModel));
        closeModal();
    };

    // Close the modal and tidy up the bindings.
    var closeModal = function() {
        $modal.modal('hide');
        $fileUpload.find(previewSelector).empty();
        ko.cleanNode($fileUpload[0]);
    };

    ko.applyBindings(documentViewModel, $fileUpload[0]);

    // Do the binding from the model to the view?  Or assume done already?
    $modal.modal({backdrop:'static'});
    $modal.on('shown', function() {
        $modal.find('form').validationEngine({'custom_error_messages': {
            '#thirdPartyConsentCheckbox': {
                'required': {'message':'The privacy declaration is required for images viewable by everyone'}
            },

        }, scroll:false, autoPositionUpdate:true, promptPosition:'inline'});
    });

    return result;
}

function findDocumentByRole(documents, role) {
    for (var i=0; i<documents.length; i++) {
        var docRole = ko.utils.unwrapObservable(documents[i].role);
        var status = ko.utils.unwrapObservable(documents[i].status);

        if (docRole === role && status !== 'deleted') {
            return documents[i];
        }
    }
    return null;
};

function findDocumentById(documents, id) {
    if (documents) {
        for (var i=0; i<documents.length; i++) {
            var docId = ko.utils.unwrapObservable(documents[i].documentId);
            var status = ko.utils.unwrapObservable(documents[i].status);
            if (docId === id && status !== 'deleted') {
                return documents[i];
            }
        }
    }
    return null;
}

var DocModel = function (doc) {
    var self = this;
    this.name = doc.name;
    this.attribution = doc.attribution;
    this.filename = doc.filename;
    this.type = doc.type;
    this.url = doc.url;
    this.thumbnailUrl = doc.thumbnailUrl ? doc.thumbnailUrl : doc.url;
    this.filetypeImg = function () {
        return imageLocation + "/filetypes/" + iconnameFromFilename(self.filename);
    };
};
function DocListViewModel(documents) {
    var self = this;
    this.documents = ko.observableArray($.map(documents, function(doc) { return new DocModel(doc)} ));
}
function iconnameFromFilename(filename) {
    if (filename === undefined) { return "_blank.png"; }
    var ext = filename.split('.').pop(),
        types = ['aac','ai','aiff','avi','bmp','c','cpp','css','dat','dmg','doc','dotx','dwg','dxf',
            'eps','exe','flv','gif','h','hpp','html','ics','iso','java','jpg','key','mid','mp3','mp4',
            'mpg','odf','ods','odt','otp','ots','ott','pdf','php','png','ppt','psd','py','qt','rar','rb',
            'rtf','sql','tga','tgz','tiff','tif','txt','wav','xls','xlsx'];
    ext = ext.toLowerCase();
    if (ext === 'docx') { ext = 'doc' }
    if ($.inArray(ext, types) >= 0) {
        return ext + '.png';
    } else {
        return "_blank.png";
    }
}

var HelpLinksViewModel = function(helpLinks, validationElementSelector) {
    var HELP_LINK_ROLE = 'helpResource';
    var self = this;

    self.helpLinks = ko.observableArray([]);
    self.types = ko.observableArray([{type:'text', description:'Document'}, {type:'video', description:'Video'}]);
    self.addLink = function(link) {
        if (link) {
            link.role = HELP_LINK_ROLE;
        }
        var doc = new DocumentViewModel(link || {role:HELP_LINK_ROLE});

        self.helpLinks.push(doc);
    };
    self.modelAsJSON = function() {
        var documents = [];
        for (var i=0; i<self.helpLinks().length; i++) {
            documents.push(self.helpLinks()[i].modelForSaving());

        }
        return JSON.stringify(documents);
    }
    self.save = function() {
        if ($(validationElementSelector).validationEngine('validate')) {
            self.saveWithErrorDetection(function() {$.unblockUI()});
        }
    };
    self.cancel = function() {
        window.location.reload();
    }

    for (var i=0; i<helpLinks.length; i++) {
        if (!helpLinks[i].labels) {
            helpLinks[i].labels = ['sort-'+i];
        }
        self.addLink(helpLinks[i]);
    }
    self.helpLinks.sort( function(left, right) {
        var leftSort = left.labels[0];
        var rightSort = right.labels[0];
        return leftSort == rightSort ? 0 : (leftSort < rightSort ? -1 : 1)
    });
    $(validationElementSelector).validationEngine();
    autoSaveModel(self, fcConfig.documentBulkUpdateUrl, {blockUIOnSave:true});
};

function initialiseDocumentTable(containerSelector) {
    var tableSelector = containerSelector + ' .docs-table';
    var table = $(tableSelector).DataTable(
        {
            "columnDefs": [
                {"type": "alt-string", "targets": 0},
                {"width":"6em", orderData:[4], "targets": [3]},
                {"width":"4em", "targets": [2]},
                {"visible":false, "targets": [4]}
            ],
            "order":[[2, 'desc'], [3, 'desc']],
            "dom":
            "<'row-fluid'<'span5'l><'span7'f>r>" +
            "<'row-fluid'<'span12't>>" +
            "<'row-fluid'<'span6'i><'span6'p>>"

        });

    $(tableSelector +" tr").on('click', function(e) {
        $(tableSelector + " tr.info").removeClass('info');
        $(e.currentTarget).addClass("info");
    });

    function searchStage(searchString) {
        table.columns(2).search(searchString, true).draw();
    }

    $(containerSelector + " input[name='stage-filter']").click(function(e) {
        var searchString = '';
        $(containerSelector + " input[name='stage-filter']").each(function(val) {
            var $el = $(this);

            if ($el.is(":checked")) {
                if (searchString) {
                    searchString += '|';
                }

                searchString += $el.val();
            }
        });

        searchStage(searchString);

    });

    var filterSelector = containerSelector + ' #filter-by-stage';
    $(filterSelector + ' a').on('click', function (event) {
        if (event.target == this) {
            event.preventDefault();
            $(this).parent().toggleClass('open');
        }

    });
    $('body').on('click', function(e) {
        if (!$(filterSelector).is(e.target)
            && $(filterSelector).has(e.target).length === 0
            && $('.open').has(e.target).length === 0
        ) {
            $(filterSelector).removeClass('open');
        }
    });
}

/*
    Utilities for managing project representations.
 */

/**
 * A chance to make any on-the-fly changes to projects as they are opened.
 * @param project
 * @param callback optional callback for the results of any asynch saves
 * @returns updated project object
 */
function checkAndUpdateProject (project, callback, programs) {
    var propertiesToSave = {},
        isEmpty=function(x,p){for(p in x)return!1;return!0};
    // add any checks here - return true if the project representation needs to be saved
    var program = null;
    if (programs && project.associatedProgram) {
        var matchingProgram = $.grep(programs.programs, function(program, index) {
            return program.name == project.associatedProgram;
        });
        program = matchingProgram[0];
    }
    propertiesToSave = $.extend(propertiesToSave, createTimelineIfMissing(project, program));
    // check for saves
    if (!isEmpty(propertiesToSave) && fcConfig.projectUpdateUrl !== undefined) {
        $.ajax({
            url: fcConfig.projectUpdateUrl,
            type: 'POST',
            data: JSON.stringify(propertiesToSave),
            contentType: 'application/json',
            success: function (data) {
                if (callback) {
                    if (data.error) {
                        callback.call(this, 'error', data.detail + ' \n' + data.error);
                    } else {
                        callback.call(this, 'success');
                    }
                }
            },
            error: function (data) {
                if (callback) {
                    callback.call(this, 'error', data.status);
                }
            }
        });
    }
    return project;
}

/**
 * Injects a newly created timeline if none exists.
 * Clears (but can't delete) any currentStage property. This prop is
 * deprecated because current stage is calculated from the timeline and
 * the current date.
 * @param project
 * @returns updated properties
 */
function createTimelineIfMissing (project, program) {
    if (project.timeline === undefined) {
        var props = {};
        if (project.currentStage !== undefined) {
            props.currentStage = '';
        }
        if (program) {
            addTimelineBasedOnStartDate(project, program.reportingPeriod, program.reportingPeriodAlignedToCalendar || false);
        }
        else {
            addTimelineBasedOnStartDate(project);
        }
        props.timeline = project.timeline;
        return props;
    }
    return {};
}

/**
 * Creates a default timeline based on project start date.
 * Assumes 6 monthly stages with the first containing the project's
 * planned start date.
 * @param project
 */
function addTimelineBasedOnStartDate (project, reportingPeriod, alignToCalendar) {

    if (!reportingPeriod) {
        reportingPeriod = 6;
    }
    if (alignToCalendar == undefined) {
        alignToCalendar = true;
    }

    // planned start date should be an ISO8601 UTC string
    if (project.plannedStartDate === undefined || project.plannedStartDate === '') {
        // make one up so we can proceed
        project.plannedStartDate = new Date(Date.now()).toISOStringNoMillis();
    }
    if (project.plannedEndDate === undefined || project.plannedEndDate === '') {
        // make one up so we can proceed
        var endDate = new Date(Date.now());
        endDate = endDate.setUTCFullYear(endDate.getUTCFullYear()+5);
        project.plannedEndDate = endDate.toISOStringNoMillis();
    }

    var date = Date.fromISO(project.plannedStartDate),
        endDate = Date.fromISO(project.plannedEndDate),
        i = 0;

    if (alignToCalendar) {
        var month = date.getMonth();
        var numPeriods = Math.floor(month/reportingPeriod);
        var monthOfStartDate = numPeriods*reportingPeriod;
        var dayOfStartDate = 1;

        date = new Date(date.getFullYear(), monthOfStartDate, dayOfStartDate);
    }
    project.timeline = [];

    var duration = moment.duration({'months':reportingPeriod});

    var periodStart = moment(date);
    while (periodStart.isBefore(endDate)) {

        var periodEnd = moment(periodStart).add(duration);
        var period = {
            fromDate: periodStart.toISOString(),
            toDate:periodEnd.toISOString()
        };
        period.name = 'Stage ' + (i + 1);
        project.timeline.push(period);

        // add 6 months to date
        periodStart = periodEnd;
        i++;
    }
}

/**
 * Returns the from and to dates of the half year that the specified
 * date falls in.
 * @param date
 * @returns {{fromDate: string, toDate: string}}
 */
function getSixMonthPeriodContainingDate (date) {
    var year = date.getUTCFullYear(),
        midYear = new Date(Date.UTC(year, 6, 0));
    if (date.getTime() < midYear.getTime()) {
        return {
            fromDate: year + "-01-01T00:00:00Z",
            toDate: year + "-07-01T00:00:00Z"
        };
    } else {
        return {
            fromDate: year + "-07-01T00:00:00Z",
            toDate: (year + 1) + "-01-01T00:00:00Z"
        };
    }
}

/**
 * Returns the stage within the timeline that contains the specified date.
 * @param stages array of stage reports for the project.
 * @param UTCDateStr date must be an ISO8601 string
 * @returns {string}
 */
function findStageFromDate (stages, UTCDateStr) {
    var stage = 'unknown';
    // try a simple lexical comparison
    $.each(stages, function (i, period) {
        if (UTCDateStr > period.fromDate && UTCDateStr <= period.toDate) {
            stage = period.name;
        }
    });
    return stage;
}

/**
 * Returns stage report status.
 * @param project
 * @param stage
 * @returns {boolean}
 */
function isStageReportable (project, stage) {

    var now =  new Date().toISOStringNoMillis();
    // We want projects that finish before the end of the current reporting period to be able to be reported on
    // without having to wait for the scheduled reporting period.  (e.g. reporting period is 1 July / 1 Jan but the
    // project finishes in October)
    return stage.toDate < now || project.plannedEndDate < now;
}

function getBudgetHeaders(project) {
	var headers = [];
    var startYr = moment(project.plannedStartDate).format('YYYY');
    var endYr = moment(project.plannedEndDate).format('YYYY');;
    var startMonth = moment(project.plannedStartDate).format('M');
    var endMonth = moment(project.plannedEndDate).format('M');

    //Is startYr is between jan to june?
    if(startMonth >= 1 &&  startMonth <= 6 ){
        startYr--;
    }

    //Is the end year is between july to dec?
    if(endMonth >= 7 &&  endMonth <= 12 ){
        endYr++;
    }

    var count = endYr - startYr;
    for (i = 0; i < count; i++){
        headers.push(startYr + '/' + ++startYr);
    }
    return headers;

}

function isValid(p, a) {
	 a = a.split(".");
	 for (i in a) {
		var key = a[i];
		if (p[key] == null || p[key] == undefined){
			return '';
		}
		p = p[key];
	 }
	 return p;
}



function ProjectViewModel(project, isUserEditor, organisations) {
    var self = $.extend(this, new Documents());

    if (isUserEditor === undefined) {
        isUserEditor = false;
    }
    if (!organisations) {
        organisations = [];
    }
    var organisationsMap = {}, organisationsRMap = {};
    $.map(organisations, function(org) {
        organisationsMap[org.organisationId] = org;
        organisationsRMap[org.name] = org.organisationId;
    });

    self.name = ko.observable(project.name);
    self.aim = ko.observable(project.aim);
    self.description = ko.observable(project.description).extend({markdown:true});
    self.externalId = ko.observable(project.externalId);
    self.grantId = ko.observable(project.grantId);
    self.manager = ko.observable(project.manager);
    self.plannedStartDate = ko.observable(project.plannedStartDate).extend({simpleDate: false});
    self.plannedEndDate = ko.observable(project.plannedEndDate).extend({simpleDate: false});
    self.funding = ko.observable(project.funding).extend({currency:{}});

    self.regenerateProjectTimeline = ko.observable(false);
    self.projectDatesChanged = ko.computed(function() {
        return project.plannedStartDate != self.plannedStartDate() ||
            project.plannedEndDate != self.plannedEndDate();
    });
    var projectDefault = "active";
    if(project.status){
        projectDefault = project.status;
    }
    self.status = ko.observable(projectDefault.toLowerCase());
    self.projectStatus = [{id: 'active', name:'Active'},{id:'completed',name:'Completed'},{id:'deleted', name:'Deleted'}];

    self.organisationId = ko.observable(project.organisationId);
    self.collectoryInstitutionId = ko.computed(function() {
        var org = self.organisationId() && organisationsMap[self.organisationId()];
        return org? org.collectoryInstitutionId: "";
    });
    self.organisationName = ko.computed(function() {
        var org = self.organisationId() && organisationsMap[self.organisationId()];
        return org? org.name: project.organisationName;
    });
    self.orgIdGrantee = ko.observable(project.orgIdGrantee);
    self.orgIdSponsor = ko.observable(project.orgIdSponsor);
    self.orgIdSvcProvider = ko.observable(project.orgIdSvcProvider);

    self.serviceProviderName = ko.computed(function() {
        var org = self.orgIdSvcProvider() && organisationsMap[self.orgIdSvcProvider()];
        return org? org.name: project.serviceProviderName;
    });
    self.associatedProgram = ko.observable(); // don't initialise yet - we want the change to trigger dependents
    self.associatedSubProgram = ko.observable(project.associatedSubProgram);
    self.newsAndEvents = ko.observable(project.newsAndEvents).extend({markdown:true});
    self.projectStories = ko.observable(project.projectStories).extend({markdown:true});

    self.dataSharing = ko.observable(project.isDataSharing? "Enabled": "Disabled");
    self.dataSharingLicense = ko.observable(project.dataSharingLicense);
    self.difficulty = ko.observable(project.difficulty);
    self.gear = ko.observable(project.gear);
    self.getInvolved = ko.observable(project.getInvolved).extend({markdown:true});
    self.hasParticipantCost = ko.observable(project.hasParticipantCost);
    self.hasTeachingMaterials = ko.observable(project.hasTeachingMaterials);
    self.isCitizenScience = ko.observable(project.isCitizenScience);
    self.isDIY = ko.observable(project.isDIY);
    self.isExternal = ko.observable(project.isExternal);
    self.isMERIT = ko.observable(project.isMERIT);
    self.isMetadataSharing = ko.observable(project.isMetadataSharing);
    self.isSuitableForChildren = ko.observable(project.isSuitableForChildren);
    self.keywords = ko.observable(project.keywords);
    self.projectPrivacy = ko.observable(project.projectPrivacy);
    self.projectSiteId = project.projectSiteId;
    self.projectType = ko.observable(project.projectType);
    self.scienceType = ko.observable(project.scienceType);
    self.task = ko.observable(project.task);
    self.urlWeb = ko.observable(project.urlWeb).extend({url:true});
    self.contractStartDate = ko.observable(project.contractStartDate).extend({simpleDate: false});
    self.contractEndDate = ko.observable(project.contractEndDate).extend({simpleDate: false});

    self.transients = self.transients || {};
    self.transients.programs = [];
    self.transients.subprograms = {};
    self.transients.subprogramsToDisplay = ko.computed(function () {
        return self.transients.subprograms[self.associatedProgram()];
    });

    var isBeforeToday = function(date) {
        return moment(date) < moment().startOf('day');
    };
    var calculateDurationInDays = function(startDate, endDate) {
        var start = moment(startDate);
        var end = moment(endDate);
        var days = end.diff(start, 'days');
        return days < 0? 0: days;
    };
    var calculateDuration = function(startDate, endDate) {
        if (!startDate || !endDate) {
            return '';
        }
        return Math.ceil(calculateDurationInDays(startDate, endDate)/7);
    };
    var calculateEndDate = function(startDate, duration) {
        var start =  moment(startDate);
        var end = start.add(duration*7, 'days');
        return end.toDate().toISOStringNoMillis();
    };

    self.contractDatesFixed = ko.computed(function() {
        var programs = (self.transients.programsModel && self.transients.programsModel.programs) || [];
        var program = self.associatedProgram(); // Checked outside the loop to force the dependency checker to register this variable (the first time this is computed, the array is empty)
        for (var i=0; i<programs.length; i++) {
            if (programs[i].name === program) {
                return programs[i].projectDatesContracted;
            }
        }
        return true;
    });

    self.transients.daysRemaining = ko.pureComputed(function() {
        var end = self.plannedEndDate();
        return end? isBeforeToday(end)? 0: calculateDurationInDays(undefined, end) + 1: -1;
    });
    self.transients.daysSince = ko.pureComputed(function() {
        var startDate = self.plannedStartDate();
        if (!startDate) return -1;
        var start = moment(startDate);
        var today = moment();
        return today.diff(start, 'days');
    });
    self.transients.daysTotal = ko.pureComputed(function() {
        return self.plannedEndDate()? calculateDurationInDays(self.plannedStartDate(), self.plannedEndDate()): -1;
    });
    self.daysStatus = ko.pureComputed(function(){
        return self.transients.daysRemaining()? "active": "ended";
    });
    self.transients.since = ko.pureComputed(function(){
        var daysSince = self.transients.daysSince();
        if (daysSince < 0) {
            daysSince = -daysSince;
            if (daysSince === 1) return "tomorrow";
            if (daysSince < 30) return "in " + daysSince + " days";
            if (daysSince < 32) return "in about a month";
            if (daysSince < 365) return "in " + (daysSince / 30).toFixed(1) + " months";
            if (daysSince === 365) return "in one year";
            return "in " + (daysSince / 365).toFixed(1) + " years";
        }
        if (daysSince === 0) return "today";
        if (daysSince === 1) return "yesterday";
        if (daysSince < 30) return daysSince + " days ago";
        if (daysSince < 32) return "about a month ago";
        if (daysSince < 365) return (daysSince / 30).toFixed(1) + " months ago";
        if (daysSince === 365) return "one year ago";
        return (daysSince / 365).toFixed(1) + " years ago";
    });
    var updatingDurations = false; // Flag to prevent endless loops during change of end date / duration.
    self.transients.plannedDuration = ko.observable(calculateDuration(self.plannedStartDate(), self.plannedEndDate()));
    self.transients.plannedDuration.subscribe(function(newDuration) {
        if (updatingDurations) {
            return;
        }
        try {
            updatingDurations = true;
            self.plannedEndDate(calculateEndDate(self.plannedStartDate(), newDuration));
        }
        finally {
            updatingDurations = false;
        }
    });

    self.plannedEndDate.subscribe(function(newEndDate) {
        if (updatingDurations) {
            return;
        }
        try {
            updatingDurations = true;
            self.transients.plannedDuration(calculateDuration(self.plannedStartDate(), newEndDate));
        }
        finally {
            updatingDurations = false;
        }
    });

    self.plannedStartDate.subscribe(function(newStartDate) {
        if (updatingDurations) {
            return;
        }
        if (self.contractDatesFixed()) {
            if (!self.plannedEndDate()) {
                return;
            }
            try {
                updatingDurations = true;
                self.transients.plannedDuration(calculateDuration(newStartDate, self.plannedEndDate()));
            }
            finally {
                updatingDurations = false;
            }
        }
        else {
            if (!self.transients.plannedDuration()) {
                return;
            }
            try {
                updatingDurations = true;
                self.plannedEndDate(calculateEndDate(newStartDate, self.transients.plannedDuration()));
            }
            finally {
                updatingDurations = false;
            }
        }
    });

    self.transients.contractDuration = ko.observable(calculateDuration(self.contractStartDate(), self.contractEndDate()));
    self.transients.contractDuration.subscribe(function(newDuration) {
        if (updatingDurations) {
            return;
        }
        if (!self.contractStartDate()) {
            return;
        }
        try {
            updatingDurations = true;
            self.contractEndDate(calculateEndDate(self.contractStartDate(), newDuration));
        }
        finally {
            updatingDurations = false;
        }
    });


    self.contractEndDate.subscribe(function(newEndDate) {
        if (updatingDurations) {
            return;
        }
        if (!self.contractStartDate()) {
            return;
        }
        try {
            updatingDurations = true;
            self.transients.contractDuration(calculateDuration(self.contractStartDate(), newEndDate));
        }
        finally {
            updatingDurations = false;
        }
    });

    self.contractStartDate.subscribe(function(newStartDate) {
        if (updatingDurations) {
            return;
        }
        if (self.contractDatesFixed()) {
            if (!self.contractEndDate()) {
                return;
            }
            try {
                updatingDurations = true;
                self.transients.contractDuration(calculateDuration(newStartDate, self.contractEndDate()));
            }
            finally {
                updatingDurations = false;
            }
        }
        else {
            if (!self.transients.contractDuration()) {
                return;
            }
            try {
                updatingDurations = true;
                self.contractEndDate(calculateEndDate(newStartDate, self.transients.contractDuration()));
            }
            finally {
                updatingDurations = false;
            }
        }
    });

    self.transients.projectId = project.projectId;

    self.transients.dataSharingLicenses = [
            {lic:'CC BY', name:'Creative Commons Attribution'},
            {lic:'CC BY-NC', name:'Creative Commons Attribution-NonCommercial'},
            {lic:'CC BY-SA', name:'Creative Commons Attribution-ShareAlike'},
            {lic:'CC BY-NC-SA', name:'Creative Commons Attribution-NonCommercial-ShareAlike'}
        ];
    self.transients.organisations = organisations;

    self.transients.difficultyLevels = [ "Easy", "Medium", "Hard" ];

    var scienceTypesList = [
        {name:'Biodiversity', value:'biodiversity'},
        {name:'Ecology', value:'ecology'},
        {name:'Natural resource management', value:'nrm'}
    ];
    self.transients.availableScienceTypes = scienceTypesList;
    self.transients.scienceTypeDisplay = ko.pureComputed(function () {
        for (var st = self.scienceType(), i = 0; i < scienceTypesList.length; i++)
            if (st === scienceTypesList[i].value)
                return scienceTypesList[i].name;
    });

    var availableProjectTypes = [
        {name:'Citizen Science Project', display:'Citizen\nScience', value:'citizenScience'},
        {name:'Ecological or biological survey / assessment (not citizen science)', display:'Biological\nScience', value:'survey'},
        {name:'Natural resource management works project', display:'Works\nProject', value:'works'}
    ];
    self.transients.availableProjectTypes = availableProjectTypes;
    self.transients.kindOfProjectDisplay = ko.pureComputed(function () {
        for (var pt = self.transients.kindOfProject(), i = 0; i < availableProjectTypes.length; i++)
            if (pt === availableProjectTypes[i].value)
                return availableProjectTypes[i].display;
    });
    /** Map between the available selection of project types and how the data is stored */
    self.transients.kindOfProject = ko.pureComputed({
        read: function() {
            if (self.isCitizenScience()) {
                return 'citizenScience';
            }
            if (self.projectType()) {
                return self.projectType() == 'survey' ? 'survey' : 'works';
            }
        },
        write: function(value) {
            if (value === 'citizenScience') {
                self.isCitizenScience(true);
                self.projectType('survey');
            }
            else {
                self.isCitizenScience(false);
                self.projectType(value);
            }
        }
    });

    self.loadPrograms = function (programsModel) {
        self.transients.programsModel = programsModel;
        $.each(programsModel.programs, function (i, program) {
            if (program.readOnly && self.associatedProgram() != program.name) {
                return;
            }
            self.transients.programs.push(program.name);
            self.transients.subprograms[program.name] = $.map(program.subprograms,function (obj, i){return obj.name});
        });
        self.associatedProgram(project.associatedProgram); // to trigger the computation of sub-programs
    };

    self.toJS = function() {
        var toIgnore = self.ignore; // document properties to ignore.
        toIgnore.concat(['transients', 'daysStatus', 'projectDatesChanged', 'collectoryInstitutionId', 'ignore', 'projectStatus']);
        return ko.mapping.toJS(self, {ignore:toIgnore});
    };

    self.modelAsJSON = function() {
        return JSON.stringify(self.toJS());
    };

    // documents
    var docDefaults = newDocumentDefaults(project);
    self.addDocument = function(doc) {
        // check permissions
        if ((isUserEditor && doc.role !== 'approval') ||  doc.public) {
            doc.maxStages = docDefaults.maxStages;
            self.documents.push(new DocumentViewModel(doc));
        }
    };
    self.attachDocument = function() {
        showDocumentAttachInModal(fcConfig.documentUpdateUrl, new DocumentViewModel(docDefaults, {key:'projectId', value:project.projectId}), '#attachDocument')
            .done(function(result){
                self.documents.push(new DocumentViewModel(result))}
            );
    };
    self.editDocumentMetadata = function(document) {
        if (!document.maxStages) {
            document.maxStages = docDefaults.maxStages;
        }
        var url = fcConfig.documentUpdateUrl + "/" + document.documentId;
        showDocumentAttachInModal( url, document, '#attachDocument')
            .done(function(result){
                window.location.href = here; // The display doesn't update properly otherwise.
            });
    };
    self.deleteDocument = function(document) {
        var url = fcConfig.documentDeleteUrl+'/'+document.documentId;
        $.post(url, {}, function() {self.documents.remove(document);});

    };

    if (project.documents) {
        $.each(project.documents, function(i, doc) {
            if (doc.role === "logo") doc.public = true; // for backward compatibility
            self.addDocument(doc);
        });
    }

    // links
    if (project.links) {
        $.each(project.links, function(i, link) {
            self.addLink(link.role, link.url);
        });
    }
};

function newDocumentDefaults(project) {
    var reports = project.reports || [];
    var maxStages = reports.length;
    var currentStage  = findStageFromDate(reports, new Date().toISOStringNoMillis());
    currentStage = stageNumberFromStage(currentStage);

    return {role:'information', maxStages: maxStages, stage:currentStage};
}

/**
 * View model for use by the citizen science project finder page.
 * @param props array of project attributes
 * @constructor
 */
function CitizenScienceFinderProjectViewModel(props) {
    ProjectViewModel.apply(this, [{
        projectId: props[0],
        aim: props[1],
        description: props[3],
        difficulty: props[4],
        plannedEndDate: props[5] && new Date(props[5]),
        hasParticipantCost: props[6],
        hasTeachingMaterials: props[7],
        isDIY: props[8],
        isExternal: props[9],
        isSuitableForChildren: props[10],
        keywords: props[11],
        links: props[12],
        name: props[13],
        organisationId: props[14],
        organisationName: props[15],
        scienceType: props[16],
        plannedStartDate: props[17] && new Date(props[17]),
        documents: [
            {
                public: true,
                role: 'logo',
                url: props[18]
            }
        ],
        urlWeb: props[19]
    }, false, []]);

    var self = this;
    self.transients.locality = props[2] && props[2].locality;
    self.transients.state = props[2] && props[2].state;
}

/**
 * View model for use by the project create and edit pages.  Extends the ProjectViewModel to provide support
 * for organisation search and selection as well as saving project information.
 * @param project pre-populated or existing project data.
 * @param isUserEditor true if the user can edit the project.
 * @param userOrganisations the list of organisations for which the user is a member.
 * @param organisations the list of organisations for which the user is not a member.
 * @constructor
 */
function CreateEditProjectViewModel(project, isUserEditor, userOrganisations, organisations, options) {
    ProjectViewModel.apply(this, [project, isUserEditor, userOrganisations.concat(organisations)]);

    var defaults = {
        projectSaveUrl: fcConfig.projectUpdateUrl + '/' + (project.projectId || ''),
        organisationCreateUrl: fcConfig.organisationCreateUrl,
        blockUIOnSave:true,
        storageKey:project.projectId?project.projectId+'.savedData':'projectData'
    };
    var config = $.extend(defaults, options);

    var self = this;

    // Automatically create the site of type "Project Area" with a name of "Project area for ..."
    var siteViewModel = initSiteViewModel({type:'projectArea'});
    siteViewModel.name = ko.computed(function() {
        return 'Project area for '+self.name();
    });
    self.organisationSearch = new OrganisationSelectionViewModel(organisations, userOrganisations, project.organisationId);

    self.organisationSearch.createOrganisation = function() {
        var projectData = self.modelAsJSON();
        amplify.store(config.storageKey, projectData);
        var here = document.location.href;
        document.location.href = config.organisationCreateUrl+'?returnTo='+here+'&returning=true';
    };
    self.organisationSearch.selection.subscribe(function(newSelection) {
        if (newSelection) {
            self.organisationId(newSelection.organisationId);
        }
    });

    self.ignore = self.ignore.concat(['organisationSearch']);
    self.transients.existingLinks = project.links;

    self.modelAsJSON = function() {
        var projectData = self.toJS();

        var siteData = siteViewModel.toJS();
        var documents = ko.mapping.toJS(self.documents());
        self.fixLinkDocumentIds(self.transients.existingLinks);
        var links = ko.mapping.toJS(self.links());

        // Assemble the data into the package expected by the service.
        projectData.projectSite = siteData;
        projectData.documents = documents;
        projectData.links = links;

        return JSON.stringify(projectData);
    };

    autoSaveModel(self, config.projectSaveUrl, {blockUIOnSave:config.blockUIOnSave, blockUISaveMessage:"Saving project...", storageKey:config.storageKey});
};


/* data structures for handling output targets */
Output = function (name, scores, existingTargets, root) {
    var self = this;
    this.name = name;
    this.outcomeTarget = ko.observable(function () {
        // find any existing outcome value for this output
        var outcomeValue = "";
        $.each(existingTargets, function (j, existingTarget) {
            if (existingTarget.outcomeTarget && existingTarget.outputLabel === self.name) {
                outcomeValue = existingTarget.outcomeTarget;
                return false; // end the loop
            }
        });
        return outcomeValue;
    }());
    this.outcomeTarget.subscribe(function() {
        if (root.targetsEditable()) {
            self.isSaving(true);
            root.saveOutputTargets();
        }
    });
    this.scores = $.map(scores, function (score, index) {
        var targetValue = 0;
        $.each(existingTargets, function(j, existingTarget) {
            if (existingTarget.scoreLabel === score.label) {
                targetValue = existingTarget.target;
                return false; // end the loop
            }
        });
        return new OutputTarget(score, name, targetValue, index === 0, root);
    });
    this.isSaving = ko.observable(false);
};
Output.prototype.toJSON = function () {
    // we need to produce a flat target structure (for backwards compatibility)
    var self = this,
        targets = $.map(this.scores, function (score) {
            var js = score.toJSON();

            return js;
        });
    // add the outcome target
    targets.push({outputLabel:self.name, outcomeTarget: self.outcomeTarget()});
    return targets;
};
Output.prototype.clearSaving = function () {
    this.isSaving(false);
    $.each(this.scores, function (i, score) { score.isSaving(false) });
};

OutputTarget = function (target, outputName, value, isFirst, root) {
    var self = this;
    this.outputLabel = outputName;
    this.scoreName = target.name;
    this.scoreLabel = target.label;
    this.target = ko.observable(value).extend({numericString:1});
    this.isSaving = ko.observable(false);
    this.isFirst = isFirst;
    this.units = target.units;
    this.target.subscribe(function() {
        if (root.targetsEditable()) {
            self.isSaving(true);
            root.saveOutputTargets();
        }
    });
};
OutputTarget.prototype.toJSON = function () {
    var clone = ko.toJS(this);
    delete clone.isSaving;
    delete clone.isFirst;
    return clone;
};

var Outcome = function (target) {
    var self = this;
    this.outputLabel = target.outputLabel;
    this.outcomeText = target.outcomeText;
    this.isSaving = ko.observable(false);
};

Outcome.prototype.toJSON = function () {
    var clone = ko.toJS(this);
    delete clone.isSaving;
    return clone;
};
function OutputTargets(activities, targets, targetsEditable, targetMetadata, config) {

    var self = this;
    var defaults = {
        saveTargetsUrl: fcConfig.projectUpdateUrl
    };
    var options = $.extend(defaults, config);

    self.activitiesByOutputName = {};

    var activityTypes = {};  // this just saves us checking multiple activities of the same type

    // collect the metadata for the unique outputs for the current set of activities
    $.each(activities, function (i, activity) {
        if (!activityTypes[activity.type] && targetMetadata[activity.type]) {
            activityTypes[activity.type] = 1;
            $.each(targetMetadata[activity.type], function(outputName, scores) {
                if (!self.activitiesByOutputName[outputName]) {
                    self.activitiesByOutputName[outputName] = [];
                }
                self.activitiesByOutputName[outputName].push(activity.type);
            });
        }
        else {
            activityTypes[activity.type] = activityTypes[activity.type] + 1;
        }
    });

    self.findTarget = function(score, outputName) {
        var foundTarget = null;
        $.each(self.outputTargets(), function(i, outputAndTargets) {
            if (outputAndTargets.name == outputName) {
                $.each(outputAndTargets.scores, function(j, target) {
                    if (target.scoreLabel == score.label) {
                        foundTarget = target;
                        return false;
                    }
                });
            }

        });
        return foundTarget;
    };

    self.targetsEditable = targetsEditable;

    self.safeToRemove = function(activityType) {

        var result = true;
        if (self.onlyActivityOfType(activityType)) { // If there is more than 1 activity of the same type, it's safe to remove the activity
            if (targetMetadata[activityType]) {
                $.each(targetMetadata[activityType], function (outputName, scores) {
                    if (self.activitiesByOutputName[outputName].length == 1) {
                        $.each(scores, function (i, score) {
                            var target = self.findTarget(score, outputName);
                            if (target && target.target() && target.target() != '0') {
                                result = false;
                                return false;
                            }
                        });
                    }
                });
            }
        }
        return result;
    };

    self.onlyActivityOfType = function(activityType) {
        return activityTypes[activityType] == 1;
    };

    self.removeTargetsAssociatedWithActivityType = function(activityType) {
        var targets = self.outputTargets();
        $.each(targetMetadata[activityType], function(outputName, scores) {
            if (self.activitiesByOutputName[outputName].length == 1) {
                $.each(targets, function(i, outputAndTargets) {
                    if (outputAndTargets.name == outputName) {
                        targets.splice(i, 1);
                        return false;
                    }

                });
            }
        });
    };

    self.outputTargets = ko.observableArray([]);
    self.saveOutputTargets = function() {
        var targets = [];
        $.each(self.outputTargets(), function (i, target) {
            $.merge(targets, target.toJSON());
        });

        var json = JSON.stringify({outputTargets:targets});

        return $.ajax({
            url: options.saveTargetsUrl,
            type: 'POST',
            data: json,
            contentType: 'application/json',
            success: function (data) {
                if (data.error) {
                    alert(data.detail + ' \n' + data.error);
                }
            },
            error: function (data) {
                var status = data.status;
                alert('An unhandled error occurred: ' + data.status);
            },
            complete: function(data) {
                $.each(self.outputTargets(), function(i, target) {
                    // The timeout is here to ensure the save indicator is visible long enough for the
                    // user to notice.
                    setTimeout(function(){target.clearSaving();}, 1000);
                });
            }
        });

    };

    self.loadOutputTargets = function () {
        var activityTypes = {},  // this just saves us checking multiple activities of the same type
            uniqueOutputs = {};  // this ensures each output is unique
        // collect the metadata for the unique outputs for the current set of activities
        $.each(activities, function (i, activity) {
            if (!activityTypes[activity.type] && targetMetadata[activity.type]) {
                activityTypes[activity.type] = true;
                $.each(targetMetadata[activity.type], function(outputName, scores) {
                    if (!uniqueOutputs[outputName]) {
                        uniqueOutputs[outputName] = true;
                        self.outputTargets.push(new Output(outputName, scores, targets, self));
                    }
                });
            }
        });
    }();



}

var SiteViewModel = function (site, feature) {
    var self = $.extend(this, new Documents());

    self.siteId = site.siteId;
    self.name = ko.observable(site.name);
    self.externalId = ko.observable(site.externalId);
    self.context = ko.observable(site.context);
    self.type = ko.observable(site.type);
    self.area = ko.observable(site.area);
    self.description = ko.observable(site.description);
    self.notes = ko.observable(site.notes);
    self.extent = ko.observable(new EmptyLocation());
    self.state = ko.observable('');
    self.nrm = ko.observable('');
    self.address = ko.observable("");
    self.feature = feature;
    self.projects = site.projects || [];
    self.extentSource = ko.pureComputed({
        read: function() {
            if (self.extent()) {
                return self.extent().source();
            }
            return 'none'
        },
        write: function(value) {
            self.updateExtent(value);
        }
    });

    self.setAddress = function (address) {
        if (address.indexOf(', Australia') === address.length - 11) {
            address = address.substr(0, address.length - 11);
        }
        self.address(address);
    };
    self.poi = ko.observableArray();

    self.addPOI = function(poi) {
        self.poi.push(poi);

    };
    self.removePOI = function(poi){
        if (poi.hasPhotoPointDocuments) {
            return;
        }
        self.poi.remove(poi);
    };
    self.toJS = function(){
        var js = ko.mapping.toJS(self, {ignore:self.ignore});
        js.extent = self.extent().toJS();
        delete js.extentSource;
        delete js.extentGeometryWatcher;
        delete js.isValid;
        return js;
    };

    self.modelAsJSON = function() {
        var js = self.toJS();
        return JSON.stringify(js);
    }
    /** Check if the supplied POI has any photos attached to it */
    self.hasPhotoPointDocuments = function(poi) {
        if (!site.documents) {
            return;
        }
        var hasDoc = false;
        $.each(site.documents, function(i, doc) {
            if (doc.poiId === poi.poiId) {
                hasDoc = true;
                return false;
            }
        });
        return hasDoc;
    };
    self.saved = function(){
        return self.siteId;
    };
    self.loadPOI = function (pois) {
        if (!pois) {
            return;
        }
        $.each(pois, function (i, poi) {
            self.poi.push(new POI(poi, self.hasPhotoPointDocuments(poi)));
        });
    };
    self.loadExtent = function(){
        if(site && site.extent) {
            var extent = site.extent;
            switch (extent.source) {
                case 'point':   self.extent(new PointLocation(extent.geometry)); break;
                case 'pid':     self.extent(new PidLocation(extent.geometry)); break;
                case 'upload':  self.extent(new UploadLocation()); break;
                case 'drawn':   self.extent(new DrawnLocation(extent.geometry)); break;
            }
        } else {
            self.extent(new EmptyLocation());
        }
    };


    self.updateExtent = function(source){
        switch (source) {
            case 'point':
                if(site && site.extent) {
                    self.extent(new PointLocation(site.extent.geometry));
                } else {
                    self.extent(new PointLocation({}));
                }
                break;
            case 'pid':
                if(site && site.extent) {
                    self.extent(new PidLocation(site.extent.geometry));
                } else {
                    self.extent(new PidLocation({}));
                }
                break;
            case 'upload': self.extent(new UploadLocation({})); break;
            case 'drawn':
                //breaks the edits....
                self.extent(new DrawnLocation({}));
                break;
            default: self.extent(new EmptyLocation());
        }
    };

    self.refreshGazInfo = function() {

        var geom = self.extent().geometry();
        var lat, lng;
        if (geom.type === 'Point') {
            lat = self.extent().geometry().decimalLatitude();
            lng = self.extent().geometry().decimalLongitude();
        }
        else if (geom.centre !== undefined) {
            lat = self.extent().geometry().centre()[1];
            lng = self.extent().geometry().centre()[0];
        }
        else {
            // No coordinates we can use for the lookup.
            return;
        }

        $.ajax({
            url: fcConfig.siteMetaDataUrl,
            method:"POST",
            contentType: 'application/json',
            data:self.modelAsJSON()
        })
            .done(function (data) {
                var geom = self.extent().geometry();
                for (var name in data) {
                    if (data.hasOwnProperty(name) && geom.hasOwnProperty(name)) {
                        geom[name](data[name]);
                    }
                }
            });

        //do the google geocode lookup
        $.ajax({
            url: fcConfig.geocodeUrl + lat + "," + lng
        }).done(function (data) {
            if (data.results.length > 0) {
                self.extent().geometry().locality(data.results[0].formatted_address);
            }
        });
    };
    self.isValid = ko.pureComputed(function() {
        return self.extent() && self.extent().isValid();
    });
    self.loadPOI(site.poi);
    self.loadExtent(site.extent);


    // Watch for changes to the extent content and notify subscribers when they do.
    self.extentGeometryWatcher = ko.pureComputed(function() {
        // We care about changes to either the geometry coordinates or the PID in the case of known shape.
        var result = {};
        if (self.extent()) {
            var geom = self.extent().geometry();
            if (geom) {
                if (geom.decimalLatitude) result.decimalLatitude = ko.utils.unwrapObservable(geom.decimalLatitude);
                if (geom.decimalLongitude) result.decimalLongitude = ko.utils.unwrapObservable(geom.decimalLongitude);
                if (geom.coordinates) result.coordinates = ko.utils.unwrapObservable(geom.coordinates);
                if (geom.pid) result.pid = ko.utils.unwrapObservable(geom.pid);
                if (geom.fid) result.fid = ko.utils.unwrapObservable(geom.fid);
            }

        }
        return result;

    });
};

var POI = function (l, hasDocuments) {
    var self = this;
    self.poiId = ko.observable(exists(l, 'poiId'));
    self.name = ko.observable(exists(l,'name'));
    self.type = ko.observable(exists(l,'type'));
    self.hasPhotoPointDocuments = hasDocuments;
    var storedGeom;
    if(l !== undefined){
        storedGeom = l.geometry;
    }
    self.dragEvent = function(lat,lng){
        self.geometry().decimalLatitude(lat);
        self.geometry().decimalLongitude(lng);
    };
    self.description = ko.observable(exists(l,'description'));
    self.geometry = ko.observable({
        type: "Point",
        decimalLatitude: ko.observable(exists(storedGeom,'decimalLatitude')),
        decimalLongitude: ko.observable(exists(storedGeom,'decimalLongitude')),
        uncertainty: ko.observable(exists(storedGeom,'uncertainty')),
        precision: ko.observable(exists(storedGeom,'precision')),
        datum: ko.observable(exists(storedGeom,'datum')),
        bearing: ko.observable(exists(storedGeom,'bearing'))
    });
    self.hasCoordinate = function () {
        var hasCoordinate = self.geometry().decimalLatitude() !== undefined
            && self.geometry().decimalLatitude() !== ''
            && self.geometry().decimalLongitude() !== undefined
            && self.geometry().decimalLongitude() !== '';

        return hasCoordinate;
    };
    self.toJSON = function(){
        var js = ko.toJS(self);
        delete js.hasPhotoPointDocuments;
        if(js.geometry.decimalLatitude !== undefined
            && js.geometry.decimalLatitude !== ''
            && js.geometry.decimalLongitude !== undefined
            && js.geometry.decimalLongitude !== ''){
            js.geometry.coordinates = [js.geometry.decimalLongitude, js.geometry.decimalLatitude]
        }
        return js;
    }
};

var EmptyLocation = function () {
    this.source = ko.observable('none');
    this.geometry = ko.observable({type:'empty'});
    this.isValid = function() {
        return false;
    };
    this.toJS = function() {
        return {};
    };
};
var PointLocation = function (l) {
    var self = this;
    self.source = ko.observable('point');
    self.geometry = ko.observable({
        type: "Point",
        decimalLatitude: ko.observable(exists(l,'decimalLatitude')),
        decimalLongitude: ko.observable(exists(l,'decimalLongitude')),
        uncertainty: ko.observable(exists(l,'uncertainty')),
        precision: ko.observable(exists(l,'precision')),
        datum: ko.observable('WGS84'), // only supporting WGS84 at the moment.
        nrm: ko.observable(exists(l,'nrm')),
        state: ko.observable(exists(l,'state')),
        lga: ko.observable(exists(l,'lga')),
        locality: ko.observable(exists(l,'locality')),
        mvg: ko.observable(exists(l,'mvg')),
        mvs: ko.observable(exists(l,'mvs'))
    });
    self.hasCoordinate = function () {
        var hasCoordinate = self.geometry().decimalLatitude() !== undefined
            && self.geometry().decimalLatitude() !== ''
            && self.geometry().decimalLongitude() !== undefined
            && self.geometry().decimalLongitude() !== '';
        return hasCoordinate;
    };
    self.geometry.coordinates = ko.pureComputed(function() {
        if (self.hasCoordinate()) {
            return [self.geometry().decimalLongitude(), self.geometry().decimalLatitude()];
        }
        return undefined;
    });

    /**
     * This is called only from a map drag event so we clear uncertaintly, precision and intercept data.
     * The intercept data will be updated once the drag event ends
     */
    self.updateGeometry = function(latlng) {
        var geom = self.geometry();
        geom.decimalLatitude(latlng.lat());
        geom.decimalLongitude(latlng.lng());
        geom.uncertainty('');
        geom.precision('');
        self.clearGazInfo();
    };
    self.clearGazInfo = function() {
        var geom = self.geometry();
        geom.nrm('');
        geom.state('');
        geom.lga('');
        geom.locality('');
        geom.mvg('');
        geom.mvs('');
    };

    self.isValid = function() {
        return self.hasCoordinate();
    };

    self.toJS = function(){
        var js = ko.toJS(self);
        if(js.geometry.decimalLatitude !== undefined
            && js.geometry.decimalLatitude !== ''
            && js.geometry.decimalLongitude !== undefined
            && js.geometry.decimalLongitude !== ''){
            js.geometry.centre = [js.geometry.decimalLongitude, js.geometry.decimalLatitude]
            js.geometry.coordinates = [js.geometry.decimalLongitude, js.geometry.decimalLatitude]
        }
        return js;
    };
};

var DrawnLocation = function (l) {
    var self = this;
    self.source = ko.observable('drawn');
    self.geometry = ko.observable({
        type: ko.observable(exists(l,'type')),
        centre: ko.observable(exists(l,'centre')),
        radius: ko.observable(exists(l,'radius')),
        lga: ko.observable(exists(l,'lga')),
        state: ko.observable(exists(l,'state')),
        locality: ko.observable(exists(l,'locality')),
        nrm: ko.observable(exists(l,'nrm')),
        mvg: ko.observable(exists(l,'mvg')),
        mvs: ko.observable(exists(l,'mvs')),
        areaKmSq: ko.observable(exists(l,'areaKmSq')),
        coordinates: ko.observable(exists(l,'coordinates'))
    });
    self.updateGeom = function(l){
        self.geometry().type(exists(l,'type'));
        self.geometry().centre(exists(l,'centre'));
        self.geometry().lga(exists(l,'lga'));
        self.geometry().nrm(exists(l,'nrm'));
        self.geometry().radius(exists(l,'radius'));
        self.geometry().state(exists(l,'state'));
        self.geometry().locality(exists(l,'locality'));
        self.geometry().mvg(exists(l,'mvg'));
        self.geometry().mvs(exists(l,'mvs'));
        self.geometry().areaKmSq(exists(l,'areaKmSq'));
        self.geometry().coordinates(exists(l,'coordinates'));
    };
    self.toJS= function() {
        var js = ko.toJS(self);
        return js;
    };
    self.isValid = function() {
        return self.geometry().coordinates();
    };
};

var PidLocation = function (l) {

    // These layers are treated specially.
    var USER_UPLOAD_FID = 'c11083';
    var OLD_NRM_LAYER_FIDS = ['cl916', 'cl2111'];


    var self = this;
    self.source = ko.observable('pid');
    self.geometry = ko.observable({
        type : "pid",
        pid : ko.observable(exists(l,'pid')),
        name : ko.observable(exists(l,'name')),
        fid : ko.observable(exists(l,'fid')),
        layerName : ko.observable(exists(l,'layerName')),
        area : ko.observable(exists(l,'area')),
        nrm: ko.observable(exists(l,'nrm')),
        state: ko.observable(exists(l,'state')),
        lga: ko.observable(exists(l,'lga')),
        locality: ko.observable(exists(l,'locality')),
        centre:[]
    });
    self.refreshObjectList = function(){
        self.layerObjects([]);
        self.layerObject(undefined);
        if(self.chosenLayer() !== undefined){
            if (self.chosenLayer() != USER_UPLOAD_FID) {
                $.ajax({
                    url: fcConfig.featuresService + '?layerId=' +self.chosenLayer(),
                    dataType:'json'
                }).done(function(data) {
                    self.layerObjects(data);
                    // During initialisation of the object list, any existing value for the chosen layer will have
                    // been set to undefined because it can't match a value in the list.
                    if (l.pid) {
                        self.layerObject(l.pid);
                    }
                });
            }
            else {
                self.layerObjects([{name:'User Uploaded', pid:self.geometry().pid()}]);
                if (l.pid) {
                    self.layerObject(l.pid);
                }
            }
        }
    };
    //TODO load this from config
    self.layers = ko.observable([
        {id:'cl2120', name:'NRM'},
        {id:'cl1048', name:'IBRA 7 Regions'},
        {id:'cl1049', name:'IBRA 7 Subregions'},
        {id:'cl22',name:'Australian states'},
        {id:'cl959', name:'Local Gov. Areas'}
    ]);
    // These layers aren't selectable unless the site is already using them.  This is to support user uploaded
    // shapes and the previous version of the NRM layer.
    if (l.fid == USER_UPLOAD_FID) {
        self.layers().push({id:USER_UPLOAD_FID, name:'User Uploaded'});
    }
    else if ($.inArray(l.fid,OLD_NRM_LAYER_FIDS)) {
        self.layers().push({id: l.fid, name:'NRM Regions - pre 2015'});
    }
    self.chosenLayer = ko.observable(exists(l,'fid'));
    self.layerObjects = ko.observable([]);
    self.layerObject = ko.observable(exists(l,'pid'));

    self.updateSelectedPid = function(elements){
        if(self.layerObject() !== undefined){
            self.geometry().pid(self.layerObject());
            self.geometry().fid(self.chosenLayer());

            //additional metadata required from service layer
            $.ajax({
                url: fcConfig.featureService + '?featureId=' + self.layerObject(),
                dataType:'json'
            }).done(function(data) {
                self.geometry().name(data.name)
                self.geometry().layerName(data.fieldname)
                if(data.area_km !== undefined){
                    self.geometry().area(data.area_km)
                }

            });
        }
    };

    self.toJS = function(){
        var js = ko.toJS(self);
        delete js.layers;
        delete js.layerObjects;
        delete js.layerObject;
        delete js.chosenLayer;
        delete js.type;
        return js;
    };

    self.isValid = function() {
        return self.geometry().fid() && self.geometry().pid() && self.chosenLayer() && self.layerObject();
    };
    self.chosenLayer.subscribe(function() {
        self.refreshObjectList();
    });
    self.layerObject.subscribe(function() {
        self.updateSelectedPid();
    });
    if (exists(l,'fid')) {
        self.refreshObjectList();
    }
    else {
        // Uploaded shapes are created without a field id - assign it the correct FID.
        if (exists(l, 'pid')) {
            self.layers().push({id:USER_UPLOAD_FID, name:'User Uploaded'});
            self.chosenLayer(USER_UPLOAD_FID);

        }
    }
};

function SiteViewModelWithMapIntegration (siteData) {
    var self = this;
    SiteViewModel.apply(self, [siteData]);

    self.renderPOIs = function(){
        removeMarkers();
        for(var i=0; i<self.poi().length; i++){
            addMarker(self.poi()[i].geometry().decimalLatitude(), self.poi()[i].geometry().decimalLongitude(), self.poi()[i].name(), self.poi()[i].dragEvent)
        }
    };
    self.newPOI = function(){
        //get the center of the map
        var lngLat = getMapCentre();
        var randomBit = (self.poi().length + 1) /1000;
        var poi = new POI({name:'Point of interest #' + (self.poi().length + 1) , geometry:{decimalLongitude:lngLat[0] - (0.001+randomBit),decimalLatitude:lngLat[1] - (0.001+randomBit)}}, false);
        self.addPOI(poi);
        self.watchPOIGeometryChanges(poi);

    };
    self.notImplemented = function () {
        alert("Not implemented yet.")
    };

    self.watchPOIGeometryChanges = function(poi) {
        poi.geometry().decimalLatitude.subscribe(self.renderPOIs);
        poi.geometry().decimalLongitude.subscribe(self.renderPOIs);
    };
    self.poi.subscribe(self.renderPOIs);
    $.each(self.poi(), function(i, poi) {
        self.watchPOIGeometryChanges(poi);
    });

    self.renderOnMap = function(){
        var currentDrawnShape = ko.toJS(self.extent().geometry);
        //retrieve the current shape if exists
        if(currentDrawnShape !== undefined){
            if(currentDrawnShape.type == 'Polygon'){
                showOnMap('polygon', geoJsonToPath(currentDrawnShape));
                zoomToShapeBounds();
            } else if(currentDrawnShape.type == 'Circle'){
                showOnMap('circle', currentDrawnShape.coordinates[1],currentDrawnShape.coordinates[0],currentDrawnShape.radius);
                zoomToShapeBounds();
            } else if(currentDrawnShape.type == 'Rectangle'){
                var shapeBounds = new google.maps.LatLngBounds(
                    new google.maps.LatLng(currentDrawnShape.minLat,currentDrawnShape.minLon),
                    new google.maps.LatLng(currentDrawnShape.maxLat,currentDrawnShape.maxLon)
                );
                //render on the map
                showOnMap('rectangle', shapeBounds);
                zoomToShapeBounds();
            } else if(currentDrawnShape.type == 'pid'){
                showObjectOnMap(currentDrawnShape.pid);
                //self.extent().setCurrentPID();
            } else if(currentDrawnShape.type == 'Point'){
                showOnMap('point', currentDrawnShape.decimalLatitude, currentDrawnShape.decimalLongitude,'site name');
                zoomToShapeBounds();
                showSatellite();
            }
        }
    };

    self.updateExtent = function(source){
        switch (source) {
            case 'point':
                if(siteData && siteData.extent && siteData.extent.source == source) {
                    self.extent(new PointLocation(siteData.extent.geometry));
                } else {
                    var centre = getMapCentre();
                    self.extent(new PointLocation({decimalLatitude:centre[1], decimalLongitude:centre[0]}));
                }
                break;
            case 'pid':
                if(siteData && siteData.extent && siteData.extent.source == source) {
                    self.extent(new PidLocation(siteData.extent.geometry));
                } else {
                    self.extent(new PidLocation({}));
                }
                break;
            case 'upload': self.extent(new UploadLocation({})); break;
            case 'drawn':
                if (siteData && siteData.extent && siteData.extent.source == source) {

                }
                else {
                    self.extent(new DrawnLocation({}));
                }
                break;
            default: self.extent(new EmptyLocation());
        }
    };

    self.shapeDrawn = function(source, type, shape) {
        var drawnShape;
        if (source === 'clear') {
            drawnShape = null;

        } else {

            switch (type) {
                case google.maps.drawing.OverlayType.CIRCLE:
                    /*// don't show or set circle props if source is a locality
                     if (source === "user-drawn") {*/
                    var center = shape.getCenter();
                    // set coord display

                    var calcAreaKm = ((3.14 * shape.getRadius() * shape.getRadius())/1000)/1000;

                    //calculate the area
                    drawnShape = {
                        type:'Circle',
                        userDrawn: 'Circle',
                        coordinates:[center.lng(), center.lat()],
                        centre: [center.lng(), center.lat()],
                        radius: shape.getRadius(),
                        areaKmSq:calcAreaKm
                    };
                    break;
                case google.maps.drawing.OverlayType.RECTANGLE:
                    var bounds = shape.getBounds(),
                        sw = bounds.getSouthWest(),
                        ne = bounds.getNorthEast();

                    //calculate the area
                    var mvcArray = new google.maps.MVCArray();
                    mvcArray.push(new google.maps.LatLng(sw.lat(), sw.lng()));
                    mvcArray.push(new google.maps.LatLng(ne.lat(), sw.lng()));
                    mvcArray.push(new google.maps.LatLng(ne.lat(), ne.lng()));
                    mvcArray.push(new google.maps.LatLng(sw.lat(), ne.lng()));
                    mvcArray.push(new google.maps.LatLng(sw.lat(), sw.lng()));

                    var calculatedArea = google.maps.geometry.spherical.computeArea(mvcArray);
                    var calcAreaKm = ((calculatedArea)/1000)/1000;

                    var centreY = (sw.lat() + ne.lat())/2;
                    var centreX =  (sw.lng() + ne.lng())/2;

                    drawnShape = {
                        type: 'Polygon',
                        userDrawn: 'Rectangle',
                        coordinates:[[
                            [sw.lng(),sw.lat()],
                            [sw.lng(),ne.lat()],
                            [ne.lng(),ne.lat()],
                            [ne.lng(),sw.lat()],
                            [sw.lng(),sw.lat()]
                        ]],
                        bbox:[sw.lat(),sw.lng(),ne.lat(),ne.lng()],
                        areaKmSq:calcAreaKm,
                        centre: [centreX,centreY]
                    }
                    break;
                case google.maps.drawing.OverlayType.POLYGON:
                    /*
                     * Note that the path received from the drawing manager does not end by repeating the starting
                     * point (number coords = number vertices). However the path derived from a WKT does repeat
                     * (num coords = num vertices + 1). So we need to check whether the last coord is the same as the
                     * first and if so ignore it.
                     */
                    var path;

                    if(shape.getPath()){
                        path = shape.getPath();
                    } else {
                        path = shape;
                    }

                    //calculate the area
                    var calculatedAreaInSqM = google.maps.geometry.spherical.computeArea(path);
                    var calcAreaKm = ((calculatedAreaInSqM)/1000)/1000;


                    //get the centre point of a polygon ??
                    var minLat=90,
                        minLng=180,
                        maxLat=-90,
                        maxLng=-180;

                    // There appears to have been an API change here - this is required locally but it
                    // still works without this change in test and prod.
                    var pathArray = path;
                    if (typeof(path.getArray) === 'function') {
                        pathArray = path.getArray();
                    }
                    $.each(pathArray, function(i){
                        var coord = path.getAt(i);
                        if(coord.lat()>maxLat) maxLat = coord.lat();
                        if(coord.lat()<minLat) minLat = coord.lat();
                        if(coord.lng()>maxLng) maxLng = coord.lng();
                        if(coord.lng()<minLng) minLng = coord.lng();
                    });
                    var centreX = minLng + ((maxLng - minLng) / 2);
                    var centreY = minLat + ((maxLat - minLat) / 2);

                    drawnShape = {
                        type:'Polygon',
                        userDrawn: 'Polygon',
                        coordinates: polygonToGeoJson(path),
                        areaKmSq: calcAreaKm,
                        centre: [centreX,centreY]
                    };
                    break;
                case google.maps.drawing.OverlayType.MARKER:

                    // Updating the point coordinates refreshes the map so don't do so until the drag is finished.
                    if (!shape.dragging) {
                        self.extent().updateGeometry(shape.getPosition());
                        self.refreshGazInfo();
                    }

                    break;
            }

        }
        //set the drawn shape
        if(drawnShape != null && type !== google.maps.drawing.OverlayType.MARKER){
            self.extent().updateGeom(drawnShape);
            self.refreshGazInfo();
        }
    };
    self.mapInitialised = function(map) {
        var updating = false;
        self.renderPOIs();
        self.renderOnMap();
        var clearAndRedraw = function() {
            if (!updating) {
                updating = true;
                setTimeout(function () {
                    clearObjectsAndShapes();
                    self.renderOnMap();
                    updating = false;
                }, 500);
            }
        }
        setCurrentShapeCallback(self.shapeDrawn);
        self.extent.subscribe(function(newExtent) {
            clearAndRedraw();
        });
        self.extentGeometryWatcher.subscribe(function() {
            clearAndRedraw();
        });
    };

    /**
     * Allows the jquery-validation-engine to respond to changes to the validity of a site extent.
     * This function returns a function that can be attached to an element via the funcCall[] validation method.
     */
    self.attachExtentValidation = function(fieldSelector, message) {
        // Expose the siteViewModel validate function in global scope so the validation engine can use it.
        var validateSiteExtent = function() {
            var result = self.isValid();
            if (!result) {
                return message || 'Please define the site extent';
            }
        };
        self.isValid.subscribe(function() {
            $(fieldSelector).validationEngine('validate');
        });
        return validateSiteExtent;
    };

};


var SitesViewModel =  function(sites, map, mapFeatures, isUserEditor) {

    var self = this;
    // sites
    var features = [];
    if (mapFeatures.features) {
        features = mapFeatures.features;
    }

    self.sites = $.map(sites, function (site, i) {
        var feature = features[i] || site.extent ? site.extent.geometry : null;
        site.feature = feature;
        site.selected = ko.observable(false);
        return site;
    });
    self.selectedSiteIds = ko.computed(function() {
        var siteIds = [];
        $.each(self.sites, function(i, site) {
            if (site.selected()) {
                siteIds.push(site.siteId);
            }
        });
        return siteIds;
    });
    self.sitesFilter = ko.observable("");
    self.throttledFilter = ko.computed(self.sitesFilter).extend({throttle: 400});
    self.filteredSites = ko.observableArray(self.sites);
    self.displayedSites = ko.observableArray();
    self.offset = ko.observable(0);
    self.pageSize = 10;
    self.isUserEditor = ko.observable(isUserEditor);
    self.getSiteName = function (siteId) {
        var site;
        if (siteId !== undefined && siteId !== '') {
            site = $.grep(self.sites, function (obj, i) {
                return (obj.siteId === siteId);
            });
            if (site.length > 0) {
                return site[0].name();
            }
        }
        return '';
    };
    // Animation callbacks for the lists
    self.showElement = function (elem) {
        if (elem.nodeType === 1) $(elem).hide().slideDown()
    };
    self.hideElement = function (elem) {
        if (elem.nodeType === 1) $(elem).slideUp(function () {
            $(elem).remove();
        })
    };

    var previousIndicies = [];
    function compareIndicies(indicies1, indicies2) {

        if (indicies1 == indicies2) {
            return true;
        }

        if (indicies1.length != indicies2.length) {
            return false;
        }
        for (var i=0; i<indicies1.length; i++) {
            if (indicies1[i] != indicies2[i]) {
                return false;
            }
        }
        return true;
    }
    /** Callback from datatables event listener so we can keep the map in sync with the table filter / pagination */
    self.sitesFiltered = function(indicies) {
        if (compareIndicies(indicies || [], previousIndicies)) {
            return;
        }
        self.displayedSites([]);
        if (indicies) {
            for (var i=0; i<indicies.length; i++) {
                self.displayedSites.push(self.sites[indicies[i]]);
            }
        }
        self.displaySites();
        previousIndicies.splice(0, previousIndicies.length);
        Array.prototype.push.apply(previousIndicies, indicies);

    };

    self.highlightSite = function(index) {
        map.highlightFeatureById(self.sites[index].siteId);
    };

    self.unHighlightSite = function(index) {
        map.unHighlightFeatureById(self.sites[index].siteId);
    };

    self.displaySites = function () {
        map.clearFeatures();

        var features = $.map(self.displayedSites(), function (obj, i) {
            var f = obj.feature;
            f.popup = obj.name;
            f.id = obj.siteId;
            return f;
        });
        map.replaceAllFeatures(features);
        self.removeMarkers();

        $.each(self.displayedSites(), function(i, site) {
            if (site.poi) {
                $.each(site.poi, function(j, poi) {
                    if (poi.geometry) {
                        self.addMarker(poi.geometry.decimalLatitude, poi.geometry.decimalLongitude, poi.name);
                    }

                });
            }
        });

    };

    var markersArray = [];

    self.addMarker = function(lat, lng, name) {

        var infowindow = new google.maps.InfoWindow({
            content: '<span class="poiMarkerPopup">' + name +'</span>'
        });

        var marker = new google.maps.Marker({
            position: new google.maps.LatLng(lat,lng),
            title:name,
            draggable:false,
            map:map.map
        });

        marker.setIcon('https://maps.google.com/mapfiles/marker_yellow.png');

        google.maps.event.addListener(marker, 'click', function() {
            infowindow.open(map.map, marker);
        });

        markersArray.push(marker);
    };

    self.removeMarkers = function() {
        if (markersArray) {
            for (var i in markersArray) {
                markersArray[i].setMap(null);
            }
        }
        markersArray = [];
    };


    this.removeSelectedSites = function () {
        bootbox.confirm("Are you sure you want to remove these sites?", function (result) {
            if (result) {
                var siteIds = self.selectedSiteIds();

                $.ajax({
                    url: fcConfig.sitesDeleteUrl,
                    type: 'POST',
                    data: JSON.stringify({siteIds:siteIds}),
                    contentType: 'application/json'
                }).done(function(data) {
                    if (data.warnings && data.warnings.length) {
                        bootbox.alert("Not all sites were able to be deleted.  Sites associated with an activity were not deleted.", function() {
                            document.location.href = here;
                        });
                    }
                    else {
                        document.location.href = here;
                    }
                }).fail(function(data) {
                    bootbox.alert("An error occurred while deleting the sites.  Please contact support if the problem persists.", function() {
                        document.location.href = here;
                    })
                });
            }
        });
    };
    this.editSite = function (site) {
        var url = fcConfig.siteEditUrl + '/' + site.siteId + '?returnTo=' + encodeURIComponent(fcConfig.returnTo);
        document.location.href = url;
    };
    this.deleteSite = function (site) {
        bootbox.confirm("Are you sure you want to remove this site from this project?", function (result) {
            if (result) {

                $.get(fcConfig.siteDeleteUrl + '?siteId=' + site.siteId, function (data) {
                    if (data.warnings && data.warnings.length) {
                        bootbox.alert("The site could not be deleted as it is used by a project activity.");
                    }
                    else {
                        document.location.href = here;
                    }
                });

            }
        });
    };
    this.viewSite = function (site) {
        var url = fcConfig.siteViewUrl + '/' + site.siteId + '?returnTo=' + encodeURIComponent(fcConfig.returnTo);
        document.location.href = url;
    };
    this.addSite = function () {
        document.location.href = fcConfig.siteCreateUrl;
    };
    this.addExistingSite = function () {
        document.location.href = fcConfig.siteSelectUrl;
    };
    this.uploadShapefile = function () {
        document.location.href = fcConfig.siteUploadUrl;
    };
    this.downloadShapefile = function() {
        window.open(fcConfig.shapefileDownloadUrl, '_blank');
    };
    self.triggerGeocoding = function () {
        ko.utils.arrayForEach(self.sites, function (site) {
            map.getAddressById(site.name(), site.setAddress);
        });
    };

    self.displaySites();
};

function geoJsonToPath(geojson){
    var coords = geojson.coordinates[0];
    return coordArrayToPath(geojson.coordinates[0]);
}

function coordArrayToPath(coords){
    var path = [];
    for(var i = 0; i<coords.length; i++){
        path.push(new google.maps.LatLng(coords[i][1],coords[i][0]));
    }
    return path;
}

/**
 * Returns a GeoJson coordinate array for the polygon
 */
function polygonToGeoJson(path){
    var firstPoint = path.getAt(0),
        points = [];
    path.forEach(function (obj, i) {
        points.push([obj.lng(),obj.lat()]);
    });
    // a polygon array from the drawingManager will not have a closing point
    // but one that has been drawn from a wkt will have - so only add closing
    // point if the first and last don't match
    if (!firstPoint.equals(path.getAt(path.length -1))) {
        // add first points at end
        points.push([firstPoint.lng(),firstPoint.lat()]);
    }
    var coordinates =  [points];
    return coordinates;
}

function round(number, places) {
    var p = places || 4;
    return places === 0 ? number.toFixed() : number.toFixed(p);
}

function representsRectangle(path) {
    // must have 5 points
    if (path.getLength() !== 5) {
        return false;
    }
    var arr = path.getArray();
    if ($.isArray(arr[0])) {
        return false;
    }  // must be multipolygon (array of arrays)
    if (arr[0].lng() != arr[1].lng()) {
        return false;
    }
    if (arr[2].lng() != arr[3].lng()) {
        return false;
    }
    if (arr[0].lat() != arr[3].lat()) {
        return false;
    }
    if (arr[1].lat() != arr[2].lat()) {
        return false;
    }
    return true
}
/*!
 * jQuery Cookie Plugin v1.4.0
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2013 Klaus Hartl
 * Released under the MIT license
 */
(function (factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as anonymous module.
		define(['jquery'], factory);
	} else {
		// Browser globals.
		factory(jQuery);
	}
}(function ($) {

	var pluses = /\+/g;

	function encode(s) {
		return config.raw ? s : encodeURIComponent(s);
	}

	function decode(s) {
		return config.raw ? s : decodeURIComponent(s);
	}

	function stringifyCookieValue(value) {
		return encode(config.json ? JSON.stringify(value) : String(value));
	}

	function parseCookieValue(s) {
		if (s.indexOf('"') === 0) {
			// This is a quoted cookie as according to RFC2068, unescape...
			s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
		}

		try {
			// Replace server-side written pluses with spaces.
			// If we can't decode the cookie, ignore it, it's unusable.
			// If we can't parse the cookie, ignore it, it's unusable.
			s = decodeURIComponent(s.replace(pluses, ' '));
			return config.json ? JSON.parse(s) : s;
		} catch(e) {}
	}

	function read(s, converter) {
		var value = config.raw ? s : parseCookieValue(s);
		return $.isFunction(converter) ? converter(value) : value;
	}

	var config = $.cookie = function (key, value, options) {

		// Write

		if (value !== undefined && !$.isFunction(value)) {
			options = $.extend({}, config.defaults, options);

			if (typeof options.expires === 'number') {
				var days = options.expires, t = options.expires = new Date();
				t.setTime(+t + days * 864e+5);
			}

			return (document.cookie = [
				encode(key), '=', stringifyCookieValue(value),
				options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
				options.path    ? '; path=' + options.path : '',
				options.domain  ? '; domain=' + options.domain : '',
				options.secure  ? '; secure' : ''
			].join(''));
		}

		// Read

		var result = key ? undefined : {};

		// To prevent the for loop in the first place assign an empty array
		// in case there are no cookies at all. Also prevents odd result when
		// calling $.cookie().
		var cookies = document.cookie ? document.cookie.split('; ') : [];

		for (var i = 0, l = cookies.length; i < l; i++) {
			var parts = cookies[i].split('=');
			var name = decode(parts.shift());
			var cookie = parts.join('=');

			if (key && key === name) {
				// If second argument (value) is a function it's a converter...
				result = read(cookie, value);
				break;
			}

			// Prevent storing a cookie that we couldn't decode.
			if (!key && (cookie = read(cookie)) !== undefined) {
				result[name] = cookie;
			}
		}

		return result;
	};

	config.defaults = {};

	$.removeCookie = function (key, options) {
		if ($.cookie(key) === undefined) {
			return false;
		}

		// Must not alter options, thus extending a fresh object...
		$.cookie(key, '', $.extend({}, options, { expires: -1 }));
		return !$.cookie(key);
	};

}));



var GreenArmyActivityViewModel = function(activity) {
    var self = this;
    $.extend(self, activity);

    self.name = activity.name;
    self.description = activity.description;
    self.projectId = activity.projectId;
    self.progress = activity.progress;
    self.publicationStatus = activity.publicationStatus ? activity.publicationStatus : 'unpublished';
    self.editable = (self.publicationStatus == 'unpublished');
    self.activityDetailsUrl = self.editable ? fcConfig.activityEditUrl+'/'+activity.activityId+'?returnTo='+fcConfig.organisationViewUrl :
    fcConfig.activityViewUrl+'/'+activity.activityId+'?returnTo='+fcConfig.organisationViewUrl;

    self.activityUrlTitle = self.editable ? 'Enter data for this report' : 'View this report';
};

var ReportViewModel = function(report) {
    $.extend(this, report);
    var self = this;

    self.description = report.description || report.name;
    self.fromDate = ko.observable(report.fromDate).extend({simpleDate:false});
    self.toDate =  ko.observable(report.toDate).extend({simpleDate:false});
    self.dueDate = ko.observable(report.dueDate).extend({simpleDate:false});
    self.progress = ko.observable(report.progress || 'planned');
    self.editUrl = '';
    self.viewUrl = fcConfig.organisationReportUrl + '?&reportId='+report.reportId;
    self.downloadUrl = fcConfig.organisationReportPDFUrl+'/'+report.reportId;
    self.percentComplete = function() {
        if (report.count == 0) {
            return 0;
        }
        return report.finishedCount / report.count * 100;
    }();

    self.reason = ko.observable();
    self.category = ko.observable();

    self.period = ko.computed(function() {
        return self.fromDate.formattedDate() + ' - ' + self.toDate.formattedDate();
    });

    self.toggleActivities = function() {
        self.activitiesVisible(!self.activitiesVisible());
    };
    self.activitiesVisible = ko.observable(false);
    self.activities = [];
    $.each(report.activities || [], function(i, activity) {
        self.activities.push(new GreenArmyActivityViewModel(activity));
    });
    self.editable = (report.bulkEditable || self.activities.length == 0 || self.activities.length == 1) && (report.publicationStatus != 'published' && report.publicationStatus != 'pendingApproval');

    self.title = 'Expand the activity list to complete the reports';
    if (self.editable) {
        self.title = 'Click to complete the report';
        self.editUrl = fcConfig.organisationReportUrl + '?edit=true&reportId='+report.reportId;
    }

    self.viewable = self.progress() == 'finished';

    self.isReportable = function() {
        return (report.toDate < new Date().toISOStringNoMillis());
    };
    self.complete = ko.computed(function() {
        return self.isReportable() && self.progress() == 'finished' && self.editable;
    });
    self.approvalTemplate = function() {
        if (!self.isReportable()) {
            return 'notReportable';
        }
        switch (report.publicationStatus) {
            case 'unpublished':
                return 'notApproved';
            case 'pendingApproval':
                return 'submitted';
            case 'published':
                return 'approved';
            default:
                return 'notApproved';
        }
    };

    self.changeReportStatus = function(url, action, blockingMessage, successMessage) {
        blockUIWithMessage(blockingMessage);
        var json = JSON.stringify({reportId:report.reportId, category:self.category(), reason:self.reason()});
        $.ajax({
            url: url,
            type: 'POST',
            data: json,
            contentType: 'application/json',
            success:function() {
                blockUIWithMessage(successMessage);
                window.location.reload();
            },
            error:function(data) {
                $.unblockUI();

                if (data.status == 401) {
                    bootbox.alert("You do not have permission to "+action+" this report.");
                }
                else {
                    bootbox.alert('An unhandled error occurred: ' + data.status);
                }
            }
        });
    };
    self.approveReport = function() {
        self.changeReportStatus(fcConfig.approveReportUrl, 'approve', 'Approving report...', 'Report approved.');
    };
    self.submitReport = function() {
        var declaration = $('#declaration')[0];
        var declarationViewModel = {
            termsAccepted : ko.observable(false),
            submitReport : function() {

                self.changeReportStatus(fcConfig.submitReportUrl, 'submit', 'Submitting report...', 'Report submitted.');
            }
        };
        ko.applyBindings(declarationViewModel, declaration);
        $(declaration).modal({ backdrop: 'static', keyboard: true, show: true }).on('hidden', function() {ko.cleanNode(declaration);});

    };

    this.rejectReport = function() {
        var $reasonModal = $('#reason-modal');
        var reasonViewModel = {
            reason: self.reason,
            rejectionCategories: ['Minor', 'Moderate', 'Major'],
            rejectionCategory: self.category,
            title:'Return report',
            buttonText: 'Return',
            submit:function() {
                if ($('.validationEngineContainer').validationEngine('attach').validationEngine('validate')) {
                    self.changeReportStatus(fcConfig.rejectReportUrl, 'return', 'Returning report...', 'Report returned.');
                }
            }
        };
        ko.applyBindings(reasonViewModel, $reasonModal[0]);
        $reasonModal.modal({backdrop: 'static', keyboard:true, show:true}).on('hidden', function() {ko.cleanNode($reasonModal[0])});
    };
};

var ReportsViewModel = function(reports, projects, availableReports) {
    var self = this;
    self.projects = projects;
    self.allReports = ko.observableArray(reports);
    self.hideApprovedReports = ko.observable(true);
    self.hideFutureReports = ko.observable(true);

    self.filteredReports = ko.computed(function() {

        var filteredReports = [];
        var now = moment().toDate().toISOStringNoMillis();

        $.each(self.allReports(), function(i, report) {
            if (self.hideApprovedReports() && report.publicationStatus === 'published') {
                return;
            }

            if (self.hideFutureReports() && report.fromDate > now) {
                return;
            }
            filteredReports.push(new ReportViewModel(report));
        });
        filteredReports.sort(function(r1, r2) {

            var result = ( ( r1.dueDate() == r2.dueDate() ) ? 0 : ( ( r1.dueDate() > r2.dueDate() ) ? 1 : -1 ) );
            if (result === 0) {
                result = ( ( r1.type == r2.type ) ? 0 : ( ( r1.type > r2.type ) ? 1 : -1 ) );
            }
            return result;
        });
        return filteredReports;
    });

    self.editReport = function(report) {
        window.location = report.editUrl;
    };

    self.viewReport = function(report) {
        window.open(report.viewUrl, 'view-report');
    };

    self.downloadReport = function(report) {
        window.open(report.downloadUrl, 'download-report');
    };

    self.viewAllReports = function(report) {
        report.toggleActivities();
    };

    self.getProject = function(projectId) {
        var projects = $.grep(self.projects, function(project) {
            return project.projectId === projectId;
        });
        return projects ? projects[0] : {name:''};
    };

    self.addReport = function() {
        $('#addReport').modal('show');
    };

    self.publicationStatusLabel = function(publicationStatus) {

        switch (publicationStatus) {
            case 'unpublished':
                return 'Stage report not submitted';
            case 'pendingApproval':
                return 'Stage report submitted';
            case 'published':
                return 'Stage report approved';
            default:
                return 'Stage report not submitted';
        }
    };


    // Data model for the new report dialog.
    var AdHocReportViewModel = function() {

        var defaultFromDate = '2014-07-01T10:00:00Z';
        var defaultToDate = '2015-07-01T10:00:00Z';
        if (reports && reports.length) {
            for (var i=0; i<reports.length; i++) {
                if (reports[i].toDate > defaultToDate) {
                    defaultToDate = reports[i].toDate;
                    defaultFromDate = reports[i].fromDate;
                }
            }
        }
        defaultFromDate = moment(defaultFromDate).add(1, 'years').toDate().toISOStringNoMillis();
        defaultToDate = moment(defaultToDate).add(1, 'years').toDate().toISOStringNoMillis();

        var self = this;
        self.type = ko.observable();

        self.organisationId = ko.observable();

        self.fromDate = ko.observable(defaultFromDate).extend({simpleDate:false});
        self.toDate = ko.observable(defaultToDate).extend({simpleDate:false});

        self.availableReports = availableReports;

        self.name = ko.computed(function() {
            var fromDate = moment(self.fromDate());
            var toDate = moment(self.toDate());

            return fromDate.get('year') + ' / ' + toDate.get('year') + ' ' + self.type();
        });

        self.dueDate = ko.computed(function() {
            var toDate = moment(self.toDate()).add(1, 'months').add(15, 'days');
            return toDate.toDate().toISOStringNoMillis();
        });

        self.save = function() {
            var reportDetails = JSON.stringify(ko.mapping.toJS(this, {'ignore':['project', 'save', 'availableReports']}));

            var reportUrl = fcConfig.reportCreateUrl;
            $.ajax({method:'POST', url:reportUrl, data:reportDetails, success:function() {window.location.reload()}, contentType:'application/json'});
        };
    };
    self.newReport = new AdHocReportViewModel();

};



/**
 * Manages the species data type in the output model.
 * Allows species information to be searched for and displayed.
 */
var SpeciesViewModel = function(data, speciesLists, options) {

    var self = this;

    self.guid = ko.observable();
    self.name = ko.observable();
    self.listId = ko.observable();
    self.transients = {};
    self.transients.speciesInformation = ko.observable();
    self.transients.availableLists = speciesLists;
    self.transients.editing = ko.observable(false);
    self.transients.textFieldValue = ko.observable();
    self.transients.bioProfileUrl =  ko.computed(function (){
        return  fcConfig.bieUrl + '/species/' + self.guid();
    });

    self.speciesSelected = function(event, data) {
        if (!data.listId) {
            data.listId = self.listId();
        }

        self.loadData(data);
        self.transients.editing(!data.name);
    };

    self.textFieldChanged = function(newValue) {
        if (newValue != self.name()) {
            self.transients.editing(true);
        }
    };

    self.listName = function(listId) {
        if (listId == 'Atlas of Living Australia') {
            return listId;
        }
        var name = '';
        $.each(self.transients.availableLists, function(i, val) {
            if (val.listId === listId) {
                name = val.listName;
                return false;
            }
        });
        return name;
    };

    self.renderItem = function(row) {

        var term = self.transients.textFieldValue();

        var result = '';
        if (!row.listId) {
            row.listId = 'Atlas of Living Australia';
        }
        if (row.listId !== 'unmatched' && row.listId !== 'error-unmatched' && self.renderItem.lastHeader !== row.listId) {
            result+='<div style="background:grey;color:white; padding-left:5px;"> '+self.listName(row.listId)+'</div>';
        }
        // We are keeping track of list headers so we only render each one once.
        self.renderItem.lastHeader = row.listId ? row.listId : 'Atlas of Living Australia';
        result+='<a class="speciesAutocompleteRow">';
        if (row.listId && row.listId === 'unmatched') {
            result += '<i>Unlisted or unknown species</i>';
        }
        else if (row.listId && row.listId === 'error-unmatched') {
            result += '<i>Offline</i><div>Species:<b>'+row.name+'</b></div>';
        }
        else {

            var commonNameMatches = row.commonNameMatches !== undefined ? row.commonNameMatches : "";

            result += (row.scientificNameMatches && row.scientificNameMatches.length>0) ? row.scientificNameMatches[0] : commonNameMatches ;
            if (row.name != result && row.rankString) {
                result = result + "<div class='autoLine2'>" + row.rankString + ": " + row.name + "</div>";
            } else if (row.rankString) {
                result = result + "<div class='autoLine2'>" + row.rankString + "</div>";
            }
        }
        result += '</a>';
        return result;
    };
    self.loadData = function(data) {
        if (!data) data = {};
        self['guid'](orBlank(data.guid));
        self['name'](orBlank(data.name));
        self['listId'](orBlank(data.listId));

        self.transients.textFieldValue(self.name());
        if (self.guid() && !options.printable) {

            var profileUrl = fcConfig.bieUrl + '/species/' + encodeURIComponent(self.guid());
            $.ajax({
                url: fcConfig.speciesProfileUrl+'/' + encodeURIComponent(self.guid()),
                dataType: 'json',
                success: function (data) {
                    var profileInfo = '<a href="'+profileUrl+'" target="_blank">';
                    var imageUrl = data.thumbnail || (data.taxonConcept && data.taxonConcept.smallImageUrl);

                    if (imageUrl) {
                        profileInfo += "<img title='Click to show profile' class='taxon-image ui-corner-all' src='"+imageUrl+"'>";
                    }
                    else {
                        profileInfo += "No profile image available";
                    }
                    profileInfo += "</a>";
                    self.transients.speciesInformation(profileInfo);
                },
                error: function(request, status, error) {
                    console.log(error);
                }
            });
        }
        else {
            if (self.listId() === 'unmatched') {
                self.transients.speciesInformation("This species was unable to be matched in the Atlas of Living Australia.");
            }
            else {
                self.transients.speciesInformation("No profile information is available.");
            }
        }

    };
    self.list = ko.computed(function() {
        if (self.transients.availableLists.length) {
            // Only supporting a single species list per activity at the moment.
            return self.transients.availableLists[0].listId;
        }
        return '';
    });

    if (data) {
        self.loadData(data);
    }
    self.focusLost = function(event) {
        self.transients.editing(false);
        if (self.name()) {
            self.transients.textFieldValue(self.name());
        }
        else {
            self.transients.textFieldValue('');
        }
    };


};

