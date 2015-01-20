#include <aJSON.h>
#include <stdio.h>

#define M1_in1  3
#define M1_in2  9
#define M2_in1  10
#define M2_in2  11

#define DIST_S 0 

#define LED_PIN 6
#define DET_LED 5

char  val;
int Speed = 100;

char  str[128];
int count = 0;

//距離チェック
int front_dist_check(){
  int  temp, distance;
  
  delay(50);
  temp = analogRead(DIST_S);
  if(temp < 4 ){
     temp = 4;
  }
  
  distance = (6787/(temp-3))-4;
  //Serial.println(distance, DEC);
  
  return(distance);
}

void full_stop(){
  analogWrite(M1_in1, 0);
  analogWrite(M1_in2, 0);    
  analogWrite(M2_in1, 0);
  analogWrite(M2_in2, 0);    
  //delay(300);
}

void forward(int mtime, int lpower){
  if(mtime < 0 ){
    return;
  }
 
  analogWrite(M1_in1, lpower);
  analogWrite(M1_in2, 0);    
  analogWrite(M2_in1, lpower);
  analogWrite(M2_in2, 0);    

  //mtime>0, move mtime msec, mtime->0 keep running
  if(mtime>0){
    delay(mtime);  
    full_stop();
  }
  return;  
}

void reverse(int mtime, int lpower){
  analogWrite(M1_in1, 0);
  analogWrite(M1_in2, lpower);    
  analogWrite(M2_in1, 0);
  analogWrite(M2_in2, lpower);    

  //mtime>0, move mtime msec, mtime->0 keep running
  if(mtime>0){
    delay(mtime);  
    full_stop();
  }
  return;  
}

void left(int mtime, int lpower){
  if(mtime < 0 ){
    return;
  }
  
  analogWrite(M1_in1, lpower);
  analogWrite(M1_in2, 0);    
  analogWrite(M2_in1, 0);
  analogWrite(M2_in2, lpower);     

  //mtime>0, move mtime msec, mtime->0 keep running
  if(mtime>0){
    delay(mtime);  
    full_stop();
  }
  return;    
}

void right(int mtime, int lpower){
  if(mtime < 0 ){
    return;
  }
  
  analogWrite(M1_in1, 0);
  analogWrite(M1_in2, lpower);    
  analogWrite(M2_in1, lpower);
  analogWrite(M2_in2, 0);  

  //mtime>0, move mtime msec, mtime->0 keep running
  if(mtime>0){
    delay(mtime);  
    full_stop();
  }
  return;    
}

void setup(){
  Serial.begin(57600);
}

void Serial_gets(char *buf, char sw){
  int i = 0;
  char c;
  while(1){
    if(Serial.available()){
      c = Serial.read();
      //Serial.print("read->");
      //Serial.println(c, DEC);
      buf[i] = c;
      if(c == sw){
          //Serial.println("---break");
          //return;
          break;
      }
      i++;
      //if( i == 256 ){
      //  break; //fool safe
      //}
    }
  }
}

void loop(){
  int   i;
  char  dmy[8];
  char  nl = 10; //改行コード
  char  buf[256];
  int   power_num;
  aJsonObject* jsonObject=NULL ;
  aJsonObject* name=NULL;
  aJsonObject* power=NULL;
  char *jsonStr;
  
  //length output
/**  
  int length = front_dist_check();
  aJsonObject* aJosnLength = aJson.createObject();
  aJson.addNumberToObject(aJosnLength,"length", length);
  jsonStr = aJson.print(aJosnLength);
  Serial.println(jsonStr);
  aJson.deleteItem(aJosnLength); free(jsonStr);
  delay(500);
**/

  //Serial.print("->");
  memset(str, 0, sizeof(str));
  memset(dmy,0, sizeof(dmy));
  if(Serial.available()){
    //Serial.println("data received");
    //Serial.println(x, DEC);
    Serial.println("--serial_get---");
    Serial_gets(str, 10);
    Serial.print("---str: "); Serial.println(str);
    //Serial.print(str);
    //Serial.println("data received done");
    
    jsonObject = aJson.parse(str);
    //jsonが取得できない場合はパス
    if(jsonObject != NULL ){
      name = aJson.getObjectItem(jsonObject, "name");
      power = aJson.getObjectItem(jsonObject, "power");
      power_num = atoi(power->valuestring);
      strcpy(dmy, name->valuestring);
      
      //Serial.println("---");
      sprintf(buf, "%d: name=[%s], power=[%d]", count++,
                        name->valuestring,power_num );
      Serial.println(buf);
      //Serial.println("---jsone parse done");
      
      //aJson.deleteItem(name);aJson.deleteItem(power);
      aJson.deleteItem(jsonObject);
    }
  }
  
  
  if(strcmp(dmy, "Right") == 0){
    right(0,power_num );
  }
  if(strcmp(dmy, "Left") == 0){
    left(0, power_num);
  }
  if(strcmp(dmy, "Go") == 0){
    forward(0, power_num);
  }
  if(strcmp(dmy, "Back") == 0){
    reverse(0, power_num);
  }
  if(strcmp(dmy, "Stop") == 0){
    full_stop();
  }  
  
 
}
