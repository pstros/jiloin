/*
/*
 * Jiloin, Jitsi Logging Interface
 *
 *
 * Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author Svetlana Velichkova
 */

angular.module('jitsiLogs').filter('query', ['QueryBuilder', '$filter',
    function(QueryBuilder, $filter) {
        function sortSeries(filter, response) {
            var order = QueryBuilder.getCorrectSeriesOrder(filter).split(',');
            var sortedResponse = [];
            var ordered = 0;
            for(var i = 0; i < order.length; i++) {
                for(var j = 0; j < response.length; j++) {
                    if(order[i] === response[j].name) {
                        sortedResponse[ordered] = response[j];
                        ordered++;
                    }
                }
            }
            return sortedResponse;
        }
    return function(response, filter) {
        switch(filter) {
            //merge conference_created and conference_room series so we
            //have the names of the conferences
            case 'conferences':
            case 'room_jid':
                var data = response['results'][0]['series'];
                for(var i = 0; i < data[0].columns.length; i++){
                    if(data[0].columns[i] === 'room_jid') {
                        data[0].columns[i] = 'room_name';
                        for(var j = 0; j < data[0].values.length; j++) {
                            var jid = data[0].values[j][i];
                            //we assume the conference name does not include a @
                            data[0].values[j][i] = jid.substr(0, jid.indexOf('@'));
                        }
                    }
                }
                response = data;
                break;
            //we get the results sorted alphabetically so we sort them
            //in the order we want to show them
            case 'conference_id':
                var data = {};

                var series = response['results'][0]['series'];

                for(var i = 0; i < series.length; i++) {
                    if(series[i].name === 'conference_room') {
                        for(var j = 0; j < series[i].columns.length; j++) {
                            if(series[i].columns[j] === 'room_jid') {
                                var jid = series[i].values[0][j];
                                data.room_name = jid.substr(0, jid.indexOf('@'));
                                break;
                            }
                        }
                    } else if(series[i].name === 'conference_created') {
                        data.created = $filter('time')(series[i].values[0][0]);
                    } else if(series[i].name === 'conference_expired') {
                        if(series[i].values.length > 0) {
                            data.expired = $filter('time')(series[i].values[0][0]);
                        }
                    }
                }
                if(!data.expired) {
                    data.expired = 'Ongoing';
                }
                response = data;
                break;
            case "endpoint_id":
                var info = {};
                var tables = [];
                var data = response['results'][0]['series'];

                for(var i = 0; i < data.length; i++) {
                    if(data[i].name === 'endpoint_created') {
                        info.endpoint_created = $filter('time')(data[i].values[0][0]);
                    }
                    else if(data[i].name === 'endpoint_display_name') {
                        for(var j = 0; j < data[i].columns.length; j++) {
                            if(data[i].columns[j] === 'display_name') {
                                info.endpoint_display_name = data[i].values[0][j];
                            }
                        }
                    } else if(data[i].name === 'channel_created') {
                        tables = tables.concat(data[i]);
                    }
                }
                response = {info: info, tables: tables};
                break;
            case "conference_info":
                var data = response['results'][0]['series'];
                for(var i = 0; i < data.length; i++) {
                    if(data[i].name === 'endpoint_created') {
                        data[i].name = 'participants';
                    }
                }

                response = sortSeries(filter, data);
                break;
            default:
                response = sortSeries(filter, response);
        }
        return response;
    }
}]);
