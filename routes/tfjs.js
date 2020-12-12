const tf = require("@tensorflow/tfjs-node");
const fetch = require('node-fetch')
const express = require('express');
const moment = require('moment');
const {CanvasRenderService} = require('chartjs-node-canvas');
const ChartJS = require('chart.js');
const { image } = require("canvas");
const fs = require('fs');

const router = express.Router();

let forcast = '';

// Plot the data using Chart.js, Canvas, and a node helper
const plotData = function (data1, data2, label = null) {

    const width = 800; //px
    const height = 400; //px
    const canvasRenderService = new CanvasRenderService(width, height)
    const N = label ? label : [...Array(Math.max(data1.length, data2.length)).keys()];

    (async () => {
        const config = {
            type: 'line',
            data: {
                labels: N,
                datasets: [{
                    label: 'Predicted',
                    fill: false,
                    backgroundColor: 'red',
                    borderColor: 'red',
                    data: data2,
                }, {
                    label: 'Actual',
                    backgroundColor: 'blue',
                    borderColor: 'blue',
                    data: data1,
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: 'Stock Price Prediction'
                },
                tooltips: {
                    mode: 'index',
                    intersect: false,
                },
                hover: {
                    mode: 'nearest',
                    intersect: true
                },
                scales: {
                    xAxes: [{
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'Date'
                        }
                    }],
                    yAxes: [{
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'Stock Value'
                        }
                    }]
                }
            }
        };

        const image = canvasRenderService.renderToBufferSync(config);
        fs.writeFileSync(`public/img/chart.jpg`, image);
    })();

}

const generateNextDayPrediction = function (data, timePortion) {
    let size = data.length;
    let features = [];

    for (let i = (size - timePortion); i < size; i++) {
        features.push(data[i]);
    }

    return features;
}

const minMaxScaler = function (data, min, max) {

    let scaledData = data.map(function (value) {
        return (value - min) / (max - min);
    });

    return {
        data: scaledData,
        min: min,
        max: max
    }
}


/*
    Revert min-max normalization and get the real values
*/
const minMaxInverseScaler = function (data, min, max) {

    let scaledData = data.map(function (value) {
        return value * (max - min) + min;
    });

    return {
        data: scaledData,
        min: min,
        max: max
    }
}


/*
    Get min value from array
*/
const getMin = function (data) {
    return Math.min(...data);
}


/*
    Get max value from array
*/
const getMax = function (data) {
    return Math.max(...data);
}


/*
    Adds days to given date
*/
Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

const processData = function (data, timePortion) {
    return new Promise(function (resolve, reject) {
        try {
            let trainX = [], trainY = [], size = data.length;

            let features = [];
            for (let i = 0; i < size; i++) {
                features.push(data[i]['close']);
            }

            // Scale the values
            var scaledData = minMaxScaler(features, getMin(features), getMax(features));
            let scaledFeatures = scaledData.data;

            try {
                // Create the train sets
                for (let i = timePortion; i < size; i++) {

                    for (let j = (i - timePortion); j < i; j++) {
                        trainX.push(scaledFeatures[j]);
                    }

                    trainY.push(scaledFeatures[i]);
                }

            } catch (ex) {
                resolve(ex);
                console.log(ex);
            }

            return resolve({
                size: (size - timePortion),
                timePortion: timePortion,
                trainX: trainX,
                trainY: trainY,
                min: scaledData.min,
                max: scaledData.max,
                originalData: features,
            });
        }catch (e) {
            reject(e);
        }
    });
};


const buildCnn = function (data) {
    return new Promise(function (resolve, reject) {
        try {
            //Sequential layers
            const model = tf.sequential();

            //input layer
            model.add(tf.layers.inputLayer({
                inputShape: [7, 1],
            }));

            //convolutional layer
            model.add(tf.layers.conv1d({
                kernelSize: 2,
                filters: 128,
                strides: 1,
                use_bias: true,
                activation: 'relu',
                kernelInitializer: 'VarianceScaling'
            }));

            //Average Pooling Layer
            model.add(tf.layers.averagePooling1d({
                poolSize: [2],
                strides: [1]
            }));

            //second convolutional layer
            model.add(tf.layers.conv1d({
                kernelSize: 2,
                filters: 64,
                strides: 1,
                use_bias: true,
                activation: 'relu',
                kernelInitializer: 'VarianceScaling'
            }));

            //second pooling layer
            model.add(tf.layers.averagePooling1d({
                poolSize: [2],
                strides: [1]
            }));

            //Flatten layer
            model.add(tf.layers.flatten({}));

            //Dense layer
            model.add(tf.layers.dense({
                units: 1,
                kernelInitializer: 'VarianceScaling',
                activation: 'linear'
            }));

            return resolve({
                'model': model,
                'data': data
            });
        } catch (ex) {
            reject(ex);
        }
    });
}

const cnn = function(model, data, epochs) {
    console.log("MODEL SUMMARY: ")
    model.summary();

    return new Promise(function (resolve, reject){
        try {
            //optimize using adam
            model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

            //model training
            model.fit(data.tensorTrainX, data.tensorTrainY, {
                epochs: epochs
            }).then((result) => {
                // print("Loss after last Epoch (" + result.epoch.length + ") is: " + result.history.loss[result.epoch.length-1]);
                resolve(model);
            })
        }
        catch (ex) {
            reject(ex);
        }
    });
}

router.get('*/predict', async function(req, res, next) {
    const key = 'RNQAGUEKH5UL8IF5';
    const symbol = req.query.btnName;
    const url = `https://sandbox.iexapis.com/stable/stock/${symbol}/chart/1y?token=Tpk_f94a42d2717445ac9fa1d8f8c566fc31`
    let epochs = 100;
    let timePortion = 7;
    let forecast = '';

    plotData([], []);

    await fetch(url)
        .then((response)=>{
            return response.json()
        })
        .then(function(json){

            if (symbol != '') {

                //get the datetime labels use in graph
                let labels = json.map((val) => {
                    return val['date']
                });

                //process the data and create the training sets
                processData(json, timePortion).then((result) => {

                    //create the set for stock price prediction for the next day
                    let nextDayPrediction = generateNextDayPrediction(result.originalData, result.timePortion);
                    //get the last date form the dataset
                    let predictDate = (new Date(labels[labels.length - 1] + 'T00:00:00.000')).addDays(1);

                    //build the convolutional neural network
                    buildCnn(result).then((built) => {


                        //Transform the data to tensor data
                        //reshape the data in NN input format
                        let tensorData = {
                            tensorTrainX: tf.tensor1d(built.data.trainX).reshape([built.data.size, built.data.timePortion, 1]),
                            tensorTrainY: tf.tensor1d(built.data.trainY)
                        };
                        //render the min and max in order to revert the scaled data later
                        let max = built.data.max;
                        let min = built.data.min;

                        cnn(built.model, tensorData, epochs).then((model) => {

                            var predictedX = model.predict(tensorData.tensorTrainX);
                            //Scale the next day features
                            let nextDayPredictionScaled = minMaxScaler(nextDayPrediction, min, max);
                            //Transform to tensor data
                            let tensorNextDayPrediction = tf.tensor1d(nextDayPredictionScaled.data).reshape([1, built.data.timePortion, 1]);
                            //Predict the next day stock price
                            let predictedValue = model.predict(tensorNextDayPrediction);

                            //Get the predicted data for the train set
                            predictedValue.data().then((predValue) => {
                                //Revert the scaled features, so we get the real values
                                let inversePredictedValue = minMaxInverseScaler(predValue, min, max);

                                //get the next day predicted value
                                predictedX.data().then((pred) => {
                                    //Revert the scaled feature
                                    var predictedXInverse = minMaxInverseScaler(pred, min, max);

                                    //convert Float32Array to regular Array
                                    predictedXInverse.data = Array.prototype.slice.call(predictedXInverse.data);
                                    //Add the next day predicted stock price
                                    predictedXInverse.data[predictedXInverse.data.length] = inversePredictedValue.data[0];

                                    //revert the scaled labels from trainY
                                    //so we can compare them with the predicted one
                                    var trainYInverse = minMaxInverseScaler(built.data.trainY, min, max);

                                    //plot the original (trainY) and predicted values for the same feature set (trainX)
                                    plotData(trainYInverse.data, predictedXInverse.data, labels);

                                    //print the predicted stock price value for the next day
                                    forecast = ("Predicted Stock Price of " + symbol + " for date " + moment(predictDate).format("DD-MM-YYYY") + " is: " + inversePredictedValue.data[0].toFixed(3) + "$");
                                    res.redirect(`/resultRoute?forecast=${forecast}`);

                                });

                            })
                        })

                    });
                })


            } else {
                res.redirect('/search')
            }
        })

});

module.exports = router;


