import msgspec


class DesignInput(msgspec.Struct):
    inputYamlFilename: str
    cifFileFilename: str
    protocolName: str
    numDesigns: int
    budget: int
    pipelineName: str | None = None