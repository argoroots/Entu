var configuration = {
  "ENTU_URI": 'https://' + location.hostname + '/'
}

configuration['ENTU_API'] = configuration.ENTU_URI + 'api2/'
configuration['ENTU_API_AUTH'] = configuration.ENTU_API + 'user/auth'
configuration['ENTU_API_USER'] = configuration.ENTU_API + 'user'
configuration['ENTU_API_ENTITY'] = configuration.ENTU_API + 'entity'
configuration['ENTU_API_POST_FILE'] = configuration.ENTU_API + 'file'

function obsolete() {
    var addEntuCoach = function addEntuCoach(coach_eid) {
        $.ajax({
            url: configuration['ENTU_API_ENTITY'] + '-' + training_session.eid,
            type: 'PUT',
            data: { 'kohalolek-coach'       : coach_eid }
        })
        .done(function done( data ) {
            console.log( 'Success:', data )
        })
        .fail(function fail( jqXHR, textStatus, error ) {
            console.log( jqXHR, textStatus, error )
        })
    }

    var addEntuGroup = function addEntuGroup(group_eid) {
        $.ajax({
            url: configuration['ENTU_API_ENTITY'] + '-' + training_session.eid,
            type: 'PUT',
            data: { 'kohalolek-group'       : group_eid }
        })
        .done(function done( data ) {
            console.log( 'Success:', data )
            training_session.groups[group_eid] = { pid: data.result.properties['kohalolek-group'][0].id }
        })
        .fail(function fail( jqXHR, textStatus, error ) {
            console.log( jqXHR, textStatus, error )
        })
    }

    var addEntuTrainee = function addEntuTrainee(trainee_eid) {
        $.ajax({
            url: configuration['ENTU_API_ENTITY'] + '-' + training_session.eid,
            type: 'PUT',
            data: { 'kohalolek-student'       : trainee_eid }
        })
        .done(function done( data ) {
            console.log( 'Success:', data )
            training_session.trainees[trainee_eid] = { pid: data.result.properties['kohalolek-student'][0].id }
        })
        .fail(function fail( jqXHR, textStatus, error ) {
            console.log( jqXHR, textStatus, error )
        })
    }

    var removeEntuProperty = function removeEntuProperty(entu_property) {
        console.log( 'Removing property ' + entu_property)
        var data = {}
        data[entu_property] = null
        $.ajax({
            url: configuration['ENTU_API_ENTITY'] + '-' + training_session.eid,
            type: 'PUT',
            data: data
        })
        .done(function done( data ) {
            console.log( 'Success:', data )
        })
        .fail(function fail( jqXHR, textStatus, error ) {
            console.log( jqXHR, textStatus, error )
        })
    }

    var removeEntuGroup = function removeEntuGroup(group_eid) {
        var entu_property = 'kohalolek-group.' + training_session.groups[group_eid]['pid']
        removeEntuProperty(entu_property)
    }

    var removeEntuTrainee = function removeEntuTrainee(trainee_eid) {
        var entu_property = 'kohalolek-student.' + training_session.trainees[trainee_eid]['pid']
        removeEntuProperty(entu_property)
    }

    var addEntuKohalolek = function addEntuKohalolek(successCallback) {
        var post_data = {'definition': 'kohalolek'}
        console.log(configuration['ENTU_API_ENTITY'] + '-' + configuration.kohalolekud_eid)
        $.post((configuration['ENTU_API_ENTITY'] + '-' + configuration.kohalolekud_eid), post_data, function(returned_data) {
            training_session.eid = returned_data.result.id
            console.log(returned_data.result.id)
            console.log(training_session.eid)
            addEntuCoach(configuration.ENTU_USER_ID)
            successCallback()
            $('#entu_link').append('<a href="' + configuration.ENTU_URI + 'entity/kohalolek/' + returned_data.result.id + '" target="entu_link">Link Entusse</a>')
        })
        .fail(function fail( jqXHR, textStatus, error ) {
            console.log( jqXHR, textStatus, error )
        })
    }

    var addEntuStartTime = function addEntuStartTime(start_datetime) {
        if (training_session.start !== undefined) {
            var entu_property = 'kohalolek-algus.' + training_session.start['pid']
            removeEntuProperty(entu_property)
        }
        start_datetime = start_datetime.toJSON().replace('T',' ').slice(0, 16)
        $.ajax({
            url: configuration['ENTU_API_ENTITY'] + '-' + training_session.eid,
            type: 'PUT',
            data: { 'kohalolek-algus'       : start_datetime }
        })
        .done(function done( data ) {
            console.log( 'Success:', data )
            training_session.start = { pid: data.result.properties['kohalolek-algus'][0].id }
        })
        .fail(function fail( jqXHR, textStatus, error ) {
            console.log( jqXHR, textStatus, error )
        })
    }

    var addEntuDuration = function addEntuDuration(duration_hours) {
        if (training_session.duration_hours !== undefined) {
            var entu_property = 'kohalolek-tunde.' + training_session.duration_hours['pid']
            removeEntuProperty(entu_property)
        }
        $.ajax({
            url: configuration['ENTU_API_ENTITY'] + '-' + training_session.eid,
            type: 'PUT',
            data: { 'kohalolek-tunde'       : duration_hours }
        })
        .done(function done( data ) {
            console.log( 'Success:', data )
            training_session.duration_hours = { pid: data.result.properties['kohalolek-tunde'][0].id }
        })
        .fail(function fail( jqXHR, textStatus, error ) {
            console.log( jqXHR, textStatus, error )
        })
    }

    var refreshEndDatetime = function refreshEndDatetime( gettime ) {
        start_d = new Date()
        start_d.setTime(gettime)
        $('#start_datetime').attr('gettime', gettime)
        $('#start_datetime').attr('data-date', start_d.toJSON())
        $('.datetimepicker').first().css('display','none')

        // var hours = Number($('#hours_num')[0].value)
        var minutes = Number($('[name="durationOptions"]:checked').val())
        var duration_ms = minutes * 60 * 1000 + gettime
        var duration_hours = minutes / 60

        $('.group.time').each(function () {$(this).text(start_d.toJSON().replace('T',' ').slice(0,16))})

        if (training_session.eid === undefined) {
            addEntuKohalolek(function successCallback() {
                addEntuStartTime(start_d)
                addEntuDuration(duration_hours)
            })
        } else {
            addEntuStartTime(start_d)
                addEntuDuration(duration_hours)
        }
    }
}


console.log('build.1')

$('#load_more_history_btn').click(function(event) {
})


$.get( configuration['ENTU_API_USER'] )
    .done(function fetchUserDone( data ) {
        $('#user_email').text(data.result.name + ' #' + data.result.id)
        configuration['ENTU_USER_ID'] = data.result.id
        configuration['ENTU_USER_NAME'] = data.result.name
        loadHistory()
    })
    .fail(function fail( jqXHR, textStatus, error ) {
        console.log( jqXHR.responseJSON, textStatus, error )
        checkAuth(function fetchUserDone( data ) {
            $('#user_email').text(data.result.name + ' #' + data.result.id)
            configuration['ENTU_USER_ID'] = data.result.id
            configuration['ENTU_USER_NAME'] = data.result.name
            loadHistory()
        })
    })


var loadHistory = function loadHistory() {
    $.get( configuration['ENTU_API'] + 'history' )
        .fail(function getHistoryFailed( data ) {
            // console.log( data )
            throw 'Can\'t fetch history'
        })
        .done(function getHistoryDone(data) {
            if (data.count === 0) {
                throw ('Empty history.')
                window.alert('No history events for ' + configuration['ENTU_USER_NAME'] + '!')
                return
            }
            // console.log(data)
            $('#history_count').text(data.count)
            $('#from_ts').text(data.result.from.replace('T',' ').slice(0, 16))
            $('#to_ts').text(data.result.to.replace('T',' ').slice(0, 16))

            $('#requestlog').remove()

            $('#history').empty()
            data.result.events.forEach( function(hevent) {
                var event_row = $('<div class="history event container">')
                $('#history').append(event_row)

                var event_time_field = $('<div class="history event time row col-md-12">')
                event_row.append(event_time_field)



                event_time_field.text(hevent[0].replace('T',' ').slice(0, 19))

                hevent[1].forEach( function(hitem) {
                    var event_item_row = $('<div class="history event item row col-md-12" style="margin:1em;">')
                    event_row.append(event_item_row)

                    var ei_action = $('<div class="history event item action row">')
                    ei_action
                        .append('<label for="" class="col-md-2">Action</label>')
                        .append($('<div class="col-md-10">')
                            .text(hitem['Action']))
                    event_item_row.append(ei_action)
                    if (hitem['Property'] !== null) {
                        var ei_property = $('<div class="history event item property row">')
                        ei_property
                            .append('<label for="" class="col-md-2">Property</label>')
                            .append($('<div class="col-md-10">')
                                .text(hitem['Property']))
                        event_item_row.append(ei_property)
                    }
                    if (hitem['From'] !== null) {
                        var ei_from = $('<div class="history event item from row">')
                        ei_from
                            .append('<label for="" class="col-md-2">From</label>')
                            .append($('<div class="col-md-10">')
                                .text(hitem['From']))
                        event_item_row.append(ei_from)
                    }
                    if (hitem['To'] !== null) {
                        var ei_to = $('<div class="history event item to row">')
                        ei_to
                            .append('<label for="" class="col-md-2">To</label>')
                            .append($('<div class="col-md-10">')
                                .text(hitem['To']))
                        event_item_row.append(ei_to)
                    }
                    if (hitem['Target'] !== null) {
                        var ei_target = $('<div class="history event item target row">')
                        ei_target
                            .append('<label for="" class="col-md-2">Target</label>')
                            .append($('<div class="col-md-10">')
                                .text(hitem['Target']))
                        event_item_row.append(ei_target)
                    }
                })
            })
        })

Action: "Changed entity"
From: "testeesnimi"
Property: "person-forename"
Target: 5343
To: "test eesnimi"


    // var fetchTrainees = function fetchTrainees() {
    //     $('#select_trainees').empty()

    //     groups.each(function() {
    //         number_of_entu_connections ++
    //         var group_eid = $(this).attr('eid')
    //         var group_name = $(this).attr('name')

    //         $.get( configuration['ENTU_API_ENTITY'] + '-' + group_eid + '/childs'  )
    //             .fail(function fetchTraineesFail( data ) {
    //                 console.log(data)
    //                 throw ('Failed fetching trainees for group ' + group_eid)
    //             })
    //             .done(function fetchTraineesDone( data ) {
    //                 // console.log(data)
    //                 if (data.count === 0 || !('person' in data.result)) {
    //                     throw ('No trainees in group ' + group_eid)
    //                     window.alert(group_name + ' rühmas pole lapsi!')
    //                     return
    //                 }

    //                 var group_div = $('<div id="group_' + group_eid
    //                     + '" eid="' + group_eid + '" class="group div">')
    //                 $('#select_trainees').append(group_div)

    //                 var group_header_div = $('<div id="group_header_' + group_eid
    //                     + '" eid="' + group_eid + '" class="group header row">')
    //                 group_div.append(group_header_div)

    //                 var group_name_span = $('<span id="group_name_' + group_eid
    //                     + '" eid="' + group_eid + '" class="group name col-xs-2">'
    //                     + group_name + '</span>')
    //                 group_header_div.append(group_name_span)

    //                 var group_time_span = $('<span id="group_time_' + group_eid
    //                     + '" eid="' + group_eid + '" class="group time col-xs-2">'
    //                     + $('#start_datetime > input')[0].value + '</span>')
    //                 group_header_div.append(group_time_span)

    //                 var group_size_span = $('<span id="group_size_' + group_eid
    //                     + '" eid="' + group_eid + '" class="group size col-xs-2">')
    //                     .text('Ei kedagi')
    //                 group_header_div.append(group_size_span)

    //                 var group_persons_div = $('<div id="group_persons_' + group_eid
    //                     + '" eid="' + group_eid + '" class="group persons row">')
    //                 group_div.append(group_persons_div)


    //                 data.result.person.entities.forEach(function iterateGroupChilds(entu_group_child) {
    //                     var person_eid = entu_group_child.id
    //                     var person_name = entu_group_child.name
    //                     var checkbox_input = $('<input id="CB_' + person_eid + '" eid="' + person_eid + '" type="checkbox"/>')
    //                     checkbox_input.on('change', function() {

    //                         var trainee_eid = checkbox_input.attr('eid')
    //                         if (checkbox_input.is(':checked')) {
    //                             addEntuTrainee(trainee_eid)
    //                         } else {
    //                             removeEntuTrainee(trainee_eid)
    //                         }

    //                     })
    //                     var checkbox_label = $('<label for="CB_' + person_eid + '">' + person_name + '</label>')
    //                     group_persons_div.append($('<label for="CB_' + person_eid + '" class="person select_row col-xs-6 col-sm-4 col-md-3 col-lg-3"/>')
    //                         .append(checkbox_input)
    //                         .append(checkbox_label)
    //                     )
    //                 })
    //                 if (--number_of_entu_connections === 0) {
    //                     console.log(training_session)
    //                 }
    //             })
    //     })
    // }

    // fetchGroups()
    // fetchTrainees()
}

var fetchGroups = function fetchGroups() {
    if ($('#select_groups').children().size() > 0) {
        return
    }

    $.get( configuration['ENTU_API_ENTITY'] + '-' + configuration.kohalolekud_eid )
        .done(function fetchFolder( data ) {
            // Check privileges on "kohalolekud" folder
            if (['owner','editor','expander'].indexOf(data.result.right) === -1) {
                console.log(data.result.right + ' is not enough privileges on entity ' + configuration.kohalolekud_eid)
                throw ('Not enough privileges on entity ' + configuration.kohalolekud_eid)
                alert ('Not enough privileges on entity ' + configuration.kohalolekud_eid)
            }

        })
        .fail(function fetchFolder( data ) {
            throw 'Cant fetch root folder.'
        })


    console.log('Accessing ' + configuration['ENTU_API_ENTITY'] + '?definition=group')
    $.get( configuration['ENTU_API_ENTITY'] + '?definition=group' )
        .done(function fetchGroupsOk( data ) {
            // console.log(data)
            data.result.forEach(function iterateGroups(entu_group) {
                // console.log(entu_group)
                var checkbox_div = $('<div for="CB_' + entu_group.id + '" class="CB col-xs-6 col-sm-4 col-md-3 col-lg-3"/>')
                var checkbox_label = $('<label>' + entu_group.name + '</label>')
                var checkbox_input = $('<input type="checkbox" id="CB_' + entu_group.id + '" eid="' + entu_group.id + '" name="' + entu_group.name + '" value=""/>')
                checkbox_label.prepend(checkbox_input)
                checkbox_div.append(checkbox_label)
                checkbox_input.on('change', function() {
                    if ($('#select_groups > .CB > label > :checked').size() > 0) {
                        $('#groups_rdy_btn').removeClass('hide').addClass('show')
                    } else {
                        alert('Ei saa viimast rühma maha võtta!')
                        checkbox_input.prop('checked', true);
                    }
                    var group_eid = checkbox_input.attr('eid')
                    if (training_session.eid === undefined) {
                        addEntuKohalolek(function successCallback() {
                            addEntuGroup(group_eid)
                        })
                    } else if (checkbox_input.is(':checked')) {
                        addEntuGroup(group_eid)
                    } else {
                        removeEntuGroup(group_eid)
                    }

                })
                $('#select_groups').append(checkbox_div)
            })
        })
}


var login_frame = $('<IFRAME/>')
    .attr('id', 'login_frame')
    .attr('name', 'login_frame')
    .attr('src', configuration.ENTU_API_AUTH)

var auth_in_progress = false
var checkAuth = function checkAuth(successCallback) {
    if (auth_in_progress)
        return
    auth_in_progress = true

    $.get( configuration.ENTU_API_USER )
        .done(function userOk( data ) {
            auth_in_progress = false
            $('#hours').show('slow')
            $('#datetime').show('slow')
            successCallback(data)
        })
        .fail(function userFail( data ) {
            console.log(data)
            window.location.assign('https://entu.entu.ee/auth?next=' + configuration.ENTU_URI + 'static/toolbox/')
        })
}
