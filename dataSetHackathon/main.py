#! /usr/bin/env python3

from mtagAPI.recupData import giveJsonFile, getStopNamePos


def main():
    name = "A"
    file = giveJsonFile(name)
    data = getStopNamePos(file)
    for station in data:
        print(station)

if __name__ == "__main__":
    main() 