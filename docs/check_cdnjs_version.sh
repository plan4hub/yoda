# Check HTML file cdnjs.com references to check if most recent library version is used

# Argument(s) are HTML file names to check.
# If first argument given is "update", then update the HTML file references as well.

# NOTE: Important of course to check that nothing is broken afterwards by testing the updated HTML files.

# Requires a Unix shell and jq

CDNPATH="https://cdnjs.cloudflare.com/ajax/libs/"

UPDATE="false"
if [ "$1" == "update" ]
then
	echo "update given"
	UPDATE="true"
	shift
fi 

echo $#

# Loop files
while [ $# -gt 0 ]
do
	FILE=$1
	echo "Investigating $FILE"
	shift	
	
	# Get libaries. Will give list e.g. jquery/3.4.1
	LIBS=`grep cdnjs $FILE | awk -F $CDNPATH '{print $2}' | cut -d '/' -f1-2` 
	# echo $LIBS
	
	for LIBFULL in $LIBS 
	do
		LIB=`echo $LIBFULL | cut -d'/' -f1`
		VERSION=`echo $LIBFULL | cut -d'/' -f2`
		# echo $LIBFULL
		echo "  Checking $LIB (current version $VERSION) .."
		
		# Ok, let's check if that is the most recent version
		NEWEST_VERSION=`curl --silent https://api.cdnjs.com/libraries/${LIB}?fields=version | cut -d":" -f2 | cut -d \" -f2`
		
		if [ $VERSION != $NEWEST_VERSION ]
		then
			echo "    Newer version ($NEWEST_VERSION) is available"
			if [ $UPDATE == "true" ] 
			then
				cat $FILE | sed "s/$LIB\/$VERSION/$LIB\/$NEWEST_VERSION/" > $FILE.tmp
				cp $FILE.tmp $FILE
			fi
		else
			echo "    OK"
		fi
	done
done

 


  