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

angular.module('jitsiLogs').service('Stats', [function() {
    var defaultOptions = {
        axes: {
            x: {
                key: 'x',
                type: 'linear',
                labelFunction: function(value) {
                    var time = new Date(value);
                    return time.getUTCHours() + ":" + time.getMinutes() + ":" + time.getSeconds()  ;
                },
                ticks: 10
            },
            y: {
                type: 'linear',
                ticks: 10,
                labelFunction: function(value) {
                    return value;
                }
            }
        },
        series: [
            {
                y: 'nameOfStat',
                color: 'steelblue',
                thickness: '2px',
                label: 'nameOfStat'
            }
        ],
        lineMode: 'linear',
        tension: 0.7,
        tooltip: {
            mode: 'scrubber',
            formatter: function(x, y, series) {
                return y;
            }
        },
        drawLegend: true,
        drawDots: true,
        columnsHGap: 5
    };
    var statsWanted = {
      'Conn-audio-1-0': ['bytesReceived', 'bytesSent', 'googRtt'],
      'bweforvideo': ['googActualEncBitrate', 'googAvailableSendBandwidth',
      'googRetransmitBitrate', 'googAvailableReceiveBandwidth',
      'googTargetEncBitrate', 'googBucketDelay', 'googTransmitBitrate']
    };
    var singleStatsWanted = {"Conn-audio-1-0": ["googLocalAddress", "googRemoteAddress", "googLocalCandidateType",
        "googTransportType", "googRemoteCandidateType"]};
    var boolStatsWanted = {"Conn-audio-1-0": ["googWritable", "googReadable", "googActiveConnection"] };
    var ssrcSendStats = ["audioInputLevel", "packetsLost", "googRtt",
        "googEchoCancellationReturnLossEnhancement", "googJitterReceived",
    "packetsSent", "bytesSent", "googEchoCancellationEchoDelayStdDev"];
    var ssrcRecvStats = ["googTargetDelayMs", "packetsLost",
        "packetsReceived" ,"googJitterReceived", "googPreferredJitterBufferMs",
        "googDecodingCNG", "audioOutputLevel", "bytesReceived",
        "googJitterBufferMs"];
    function getStatsData(peerStats) {
        var data = {
            charts: {},
            info: {}
            };
        var valueColumn;
        for(var i = 0; i < peerStats.columns.length; i++) {
            if(peerStats.columns[i] === 'value') {
                valueColumn = i;
            }
        }
        if(!valueColumn) {
            return data;
        }
        for(i = peerStats.values.length - 1; i >= 0; i--) {
            addPointToData(data, peerStats.values[i], valueColumn);
        }
        return data;
    }
    function addSsrcField(groupName) {
        if(!statsWanted[groupName]) {
            if(groupName.search('send') !== -1) {
                statsWanted[groupName] = ssrcSendStats;
            } else {
                statsWanted[groupName] = ssrcRecvStats;
            }
        }
    }
    function addPointToData(data, point, valueColumn) {
        var groupColumn = 0;
        if(point.length !== 4) {
            return data;
        }
        var charts = data.charts;
        var value = JSON.parse(point[valueColumn]);
        for(var i = 0; i < value.length; i++) {
            for (var type in value[i][2]) {
                if (value[i][2].hasOwnProperty(type)) {
                    var groupName = value[i][groupColumn];
                    if (groupName.search('ssrc') !== -1 && !statsWanted[groupName]) {
                        addSsrcField(groupName);
                    }
                    if (statsWanted[groupName] && statsWanted[groupName].indexOf(type) > -1) {
                        addPointToChart(charts, groupName, type, point, value[i][2]);
                    } else if (singleStatsWanted[groupName]) {
                        if(!addSingleStatValue(data, groupName, type, point, value[i][2])) {
                            addPointToChart(charts, groupName, type, point, value[i][2], true);
                        }
                    }
                }
            }
        }

    }
    function addPointToChart(charts, groupName, type, point, value, isBoolean) {
        if (!charts[groupName]) {
            charts[groupName] = {};
        }
        if (!charts[groupName][type]) {
            charts[groupName][type] = {chart: []};
            charts[groupName][type].options = angular.copy(defaultOptions);
            charts[groupName][type].options.series[0].y = type;
            charts[groupName][type].options.series[0].label = type;
        }
        var currentValue = {};
        //we assume time is always the first column
        currentValue.x = parseInt(point[0]);
        if(isBoolean) {
           currentValue[type] = value[type] === "true" ? 0 : 1;
        } else {
            currentValue[type] = parseInt(value[type]);
        }
        if (!isNaN(currentValue[type])) {
            charts[groupName][type].chart.push(currentValue);
        }
    }
    function addSingleStatValue(data, groupName, type, point, value) {
        for(var j = 0; j < singleStatsWanted[groupName].length; j++) {
            if (type === singleStatsWanted[groupName][j]) {
                if (!data.info[type]) {
                    data.info[type] = {
                        columns: ['time', type],
                        name: type,
                        values: []};
                }
                var previous = data.info[type].values.slice(-1)[0];
                if (!previous || value[type] !== previous[1]) {
                    data.info[type].values.push([point[0], value[type]]);
                }
                return true;
            }
        }
        return false;
    }
    function cleanUpStatsWanted() {
        for(var item in statsWanted) {
            if(statsWanted.hasOwnProperty(item)) {
                if(item.search('ssrc') !== -1) {
                    delete statsWanted[item];
                }
            }
        }
    }
    return {
        getOptions: function () {
            return options;
        },
        getStatsData: function (response) {
            if (typeof response['results'][0]['series'] === 'undefined') {
                console.log("no valid response");
                return;
            }

            var series = response['results'][0]['series'];

            //find the index of the peer_connection_stats series
            for (var statsIndex = 0; statsIndex < series.length; statsIndex++) {
                if (series[statsIndex].name === 'peer_connection_stats') {
                    break;
                }
            }
            if(statsIndex === series.length) {
                return;
            }
            var data = getStatsData(series[statsIndex]);

            cleanUpStatsWanted();
            return data;
        }
    }
}]);
