trap "pkill -P $$" SIGINT SIGTERM EXIT

PARALLELISM=$1
RANGE=$2
MODE=$3
CONFIG_DATA_JSON=$(<~/borv3/config.json)

if [[ -f "./mnemonics" ]]; then
    readarray -t mnemonics < ./mnemonics
else 
    mnemonics=("")
    for (( c=2; c<=$PARALLELISM; c++ ))
    do 
        mnemonics+=("")
    done
fi

COUNT=0

# https://stackoverflow.com/questions/9084257/bash-array-with-spaces-in-elements
for MNEMONIC in "${mnemonics[@]}"
do
    echo Starting run script with \"$MNEMONIC\" $COUNT
    # does not work --add-host=host.docker.internal:host-gateway
    docker run --net=host --detach -e RANGE=$RANGE -e MNEMONIC="$MNEMONIC" -e MODE="$MODE" -e CONFIG_DATA_JSON="$CONFIG_DATA_JSON" txn-spam:latest
    ((COUNT=COUNT+1))
    if [ "$COUNT" -ge "$PARALLELISM" ]; then
        break;
    fi
done

echo "Done."
