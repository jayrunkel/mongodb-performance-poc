#!/usr/bin/bash

startPort=$1
let endPort=3334+$2


for ((i=startPort; i<endPort; i++));
do
    echo "Starting server on port $i"
    ( node index.js $i & )
done
